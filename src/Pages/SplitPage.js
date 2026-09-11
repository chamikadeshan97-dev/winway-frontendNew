import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ScissorOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
  DownOutlined,
  UpOutlined,
  DownloadOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  splitForAgent,
  getLatestOrderDate,
  getAssignedCounts,
  getSessionByDate,
  getSessionLotteries,
  validateUpload,
  createSpecialSplit,
  getSpecialSplits,
  downloadSpecialFile,
  getSpecialSplitsRemaining,
  downloadSpecialZip,
  downloadRemainingZip,
  getSplitsByDate,
} from "./api/index";

const { Title, Text } = Typography;

const LOTTERY_ORDER = [
  "ada", "dana", "govi", "hada", "maha", "mgap", "jaya", "suba",
];

const LOTTERY_NAME_MAP = {
  ada: "Ada Sampatha",
  dana: "Dhana Nidhanaya",
  govi: "Govi Setha",
  hada: "Handahana",
  maha: "Mahajana Sampatha",
  mgap: "Mega Power",
  jaya: "NLB Jaya",
  suba: "Suba Dawasak",
};

const normalizeLotteryCode = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "ada" || normalized.includes("ada sampatha")) return "ada";
  if (normalized === "dana" || normalized.includes("dhana nidhanaya") || normalized.includes("dana nidhanaya")) return "dana";
  if (normalized === "govi" || normalized.includes("govi setha") || normalized.includes("govisetha")) return "govi";
  if (normalized === "hada" || normalized.includes("handahana")) return "hada";
  if (normalized === "maha" || normalized.includes("mahajana sampatha")) return "maha";
  if (normalized === "mgap" || normalized.includes("mega power")) return "mgap";
  if (normalized === "jaya" || normalized.includes("nlb jaya")) return "jaya";
  if (normalized === "suba" || normalized.includes("suba dawasak")) return "suba";
  return normalized;
};

const getSortedIndex = (value) => {
  const code = normalizeLotteryCode(value);
  const index = LOTTERY_ORDER.indexOf(code);
  return index === -1 ? LOTTERY_ORDER.length : index;
};

const getSplitLabelNumber = (label) => {
  const match = String(label || "").match(/(\d+)/);
  return match ? match[1] : label;
};

const SplitPage = () => {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState("");
  const [agent, setAgent] = useState("JAYAWAY");
  const [sessionId, setSessionId] = useState(null);
  const [lotteries, setLotteries] = useState([]);
  const [assignedCounts, setAssignedCounts] = useState([]);
  const [validation, setValidation] = useState(null);
  const [showValidationTable, setShowValidationTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState("");

  const [specialSplits, setSpecialSplits] = useState([]);
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [specialCounts, setSpecialCounts] = useState({});
  const [creatingSpecial, setCreatingSpecial] = useState(false);
  const [loadingSpecials, setLoadingSpecials] = useState(false);
  const [hasInitialSplit, setHasInitialSplit] = useState(false);
  const [remainingCounts, setRemainingCounts] = useState([]);
  const [loadingRemaining, setLoadingRemaining] = useState(false);
  const [specialFilterType, setSpecialFilterType] = useState("all");
  const [specialFilterValue, setSpecialFilterValue] = useState(null);
  const [showAssignmentTable, setShowAssignmentTable] = useState(true);

  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    loadLatestDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedDate || !agent) return;
    loadAssignedCounts(selectedDate, agent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, agent]);

  useEffect(() => {
    if (selectedDate && agent && validation?.is_valid) {
      loadSpecialSplits(selectedDate, agent);
      checkInitialSplit(selectedDate, agent);
      loadRemainingCounts(selectedDate, agent);
    } else {
      setSpecialSplits([]);
      setHasInitialSplit(false);
      setRemainingCounts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, agent, validation?.is_valid]);

  useEffect(() => {
    setShowAssignmentTable(!hasInitialSplit);
  }, [hasInitialSplit]);

  const loadLatestDate = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getLatestOrderDate();
      const latestDate = response.data?.date;
      if (latestDate) {
        setSelectedDate(latestDate);
        await loadAllData(latestDate);
      } else {
        const today = dayjs().format("YYYY-MM-DD");
        setSelectedDate(today);
        await loadAllData(today);
      }
    } catch (err) {
      console.error("Failed to load latest order date:", err);
      const today = dayjs().format("YYYY-MM-DD");
      setSelectedDate(today);
      await loadAllData(today);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async (date) => {
    if (!date) return;
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadSession(date), loadValidation(date)]);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (date) => {
    try {
      const sessionResponse = await getSessionByDate(date);
      const foundSessionId = sessionResponse.data?.session_id;
      if (!foundSessionId) {
        setSessionId(null);
        setLotteries([]);
        return;
      }
      setSessionId(foundSessionId);
      const lotteryResponse = await getSessionLotteries(foundSessionId);
      const lotteryData = Array.isArray(lotteryResponse.data) ? lotteryResponse.data : [];
      const sortedLotteries = [...lotteryData].sort((a, b) => {
        const valueA = a.lottery_code || a.lottery_name;
        const valueB = b.lottery_code || b.lottery_name;
        return getSortedIndex(valueA) - getSortedIndex(valueB);
      });
      setLotteries(sortedLotteries);
    } catch (err) {
      console.error("Failed to load upload session:", err);
      setSessionId(null);
      setLotteries([]);
    }
  };

  const loadValidation = async (date) => {
    try {
      const response = await validateUpload(date);
      setValidation(response.data || null);
    } catch (err) {
      console.error("Failed to validate upload:", err);
      setValidation(null);
    }
  };

  const loadAssignedCounts = async (date, agentName) => {
    if (!date || !agentName) return;
    setLoadingAssignments(true);
    try {
      const response = await getAssignedCounts(agentName, date);
      const assignmentData = Array.isArray(response.data) ? response.data : [];
      const sortedAssignments = [...assignmentData].sort((a, b) => {
        const valueA = a.lottery_code || a.lottery_name;
        const valueB = b.lottery_code || b.lottery_name;
        return getSortedIndex(valueA) - getSortedIndex(valueB);
      });
      setAssignedCounts(
        sortedAssignments.map((item) => ({
          ...item,
          available_quantity: Number(item.available_quantity || 0),
          assigned_count: Number(item.assigned_count || 0),
        })),
      );
    } catch (err) {
      console.error("Failed to load assigned counts:", err);
      setAssignedCounts([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadSpecialSplits = async (date, agentName) => {
    setLoadingSpecials(true);
    try {
      const response = await getSpecialSplits(agentName, date);
      setSpecialSplits(response.data || []);
    } catch (err) {
      console.error("Failed to load special splits:", err);
      setSpecialSplits([]);
    } finally {
      setLoadingSpecials(false);
    }
  };

  const checkInitialSplit = async (date, agentName) => {
    try {
      const res = await getSplitsByDate(agentName, date);
      setHasInitialSplit(res.data && res.data.length > 0);
    } catch {
      setHasInitialSplit(false);
    }
  };

  const filteredSpecialSplits = useMemo(() => {
    if (specialFilterType === "by_split" && specialFilterValue) {
      return specialSplits.filter((s) => s.label === specialFilterValue);
    }
    if (specialFilterType === "by_lottery" && specialFilterValue) {
      return specialSplits.filter(
        (s) => normalizeLotteryCode(s.lottery_code) === specialFilterValue
      );
    }
    return specialSplits;
  }, [specialSplits, specialFilterType, specialFilterValue]);

  const uniqueSplitLabels = useMemo(() => {
    const labels = specialSplits.map((s) => s.label);
    return [...new Set(labels)];
  }, [specialSplits]);

  const filterValueOptions = useMemo(() => {
    if (specialFilterType === "by_split") {
      return uniqueSplitLabels.map((label) => ({ value: label, label }));
    }
    if (specialFilterType === "by_lottery") {
      return LOTTERY_ORDER.map((code) => ({
        value: code,
        label: LOTTERY_NAME_MAP[code] || code,
      }));
    }
    return [];
  }, [specialFilterType, uniqueSplitLabels]);

  const loadRemainingCounts = async (date, agentName) => {
    setLoadingRemaining(true);
    try {
      const res = await getSpecialSplitsRemaining(agentName, date);
      const remainingData = res.data?.remaining || [];

      const enrichedRemaining = remainingData.map((item) => {
        const assignedItem = assignedCounts.find(
          (a) => a.lottery_code.toLowerCase() === item.lottery_code.toLowerCase()
        );
        return {
          ...item,
          lottery_name: assignedItem?.lottery_name || item.lottery_code,
          draw_number: assignedItem?.draw_number || "",
        };
      });

      const sortedEnriched = [...enrichedRemaining].sort((a, b) => {
        return getSortedIndex(a.lottery_code) - getSortedIndex(b.lottery_code);
      });

      setRemainingCounts(sortedEnriched);
    } catch {
      setRemainingCounts([]);
    } finally {
      setLoadingRemaining(false);
    }
  };

  const totalRemaining = useMemo(() => {
    return remainingCounts.reduce((sum, item) => sum + Number(item.remaining_count || 0), 0);
  }, [remainingCounts]);

  const totalSpecialTake = useMemo(() => {
    return Object.values(specialCounts).reduce(
      (sum, val) => sum + Number(val || 0),
      0,
    );
  }, [specialCounts]);

  const newRemainingTotal = useMemo(() => {
    return totalRemaining - totalSpecialTake;
  }, [totalRemaining, totalSpecialTake]);

  const handleDateChange = async (date) => {
    if (!date) return;
    const formattedDate = date.format("YYYY-MM-DD");
    setSelectedDate(formattedDate);
    setSessionId(null);
    setLotteries([]);
    setAssignedCounts([]);
    setValidation(null);
    setError("");
    await loadAllData(formattedDate);
    await loadAssignedCounts(formattedDate, agent);
  };

  const handleDownloadSpecialZip = async () => {
    const options = {};
    if (specialFilterType === "by_split" && specialFilterValue) {
      options.splitLabel = specialFilterValue;
    }
    if (specialFilterType === "by_lottery" && specialFilterValue) {
      options.lotteryCode = specialFilterValue;
    }
    try {
      const res = await downloadSpecialZip(agent, selectedDate, options);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${agent}_special_splits_${selectedDate}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      messageApi.error("Failed to download special splits ZIP.");
    }
  };

  const handleDownloadRemainingZip = async () => {
    try {
      const res = await downloadRemainingZip(agent, selectedDate);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${agent}_remaining_splits_${selectedDate}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      messageApi.error("Failed to download remaining splits ZIP.");
    }
  };

  const handleDownloadSpecialZipForLabel = async (label) => {
    try {
      const res = await downloadSpecialZip(agent, selectedDate, {
        splitLabel: label,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${agent}_${label.replace(/\s+/g, "_")}_${selectedDate}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      messageApi.error(`Failed to download ${label} ZIP.`);
    }
  };

  const getMismatchInfo = (lottery) => {
    if (!validation?.mismatches?.length) return null;
    const targetCode = normalizeLotteryCode(lottery.lottery_code || lottery.lottery_name);
    return (
      validation.mismatches.find((item) => {
        const mismatchCode = normalizeLotteryCode(item.lottery_code || item.lottery_name);
        return mismatchCode === targetCode;
      }) || null
    );
  };

  const getMissingInfo = (lottery) => {
    if (!validation?.missing_lotteries?.length) return null;
    const targetCode = normalizeLotteryCode(lottery.lottery_code || lottery.lottery_name);
    return (
      validation.missing_lotteries.find((item) => {
        const missingCode = normalizeLotteryCode(item.lottery_code || item.lottery_name);
        return missingCode === targetCode;
      }) || null
    );
  };

  const getAssignmentInfo = (lottery) => {
    const targetCode = normalizeLotteryCode(lottery.lottery_code || lottery.lottery_name);
    return (
      assignedCounts.find((item) => {
        const assignedCode = normalizeLotteryCode(item.lottery_code || item.lottery_name);
        return assignedCode === targetCode;
      }) || null
    );
  };

  const totalUploadedRecords = useMemo(() => {
    return lotteries.reduce((total, item) => total + Number(item.record_count || 0), 0);
  }, [lotteries]);

  const totalAvailableQuantity = useMemo(() => {
    return assignedCounts.reduce((total, item) => total + Number(item.available_quantity || 0), 0);
  }, [assignedCounts]);

  const totalAssignedToAgent = useMemo(() => {
    return assignedCounts.reduce((total, item) => total + Number(item.assigned_count || 0), 0);
  }, [assignedCounts]);

  const assignedLotteryCount = useMemo(() => {
    return assignedCounts.filter((item) => Number(item.assigned_count || 0) > 0).length;
  }, [assignedCounts]);

  const mismatchCount = validation?.mismatches?.length || 0;
  const missingCount = validation?.missing_lotteries?.length || 0;
  const extraCount = validation?.extra_lotteries?.length || 0;

  const canSplit =
    Boolean(sessionId) &&
    Boolean(validation?.is_valid) &&
    assignedCounts.length > 0 &&
    totalAssignedToAgent > 0;

  const specialSplitMatrix = useMemo(() => {
    const labels = [...new Set(filteredSpecialSplits.map((s) => s.label))].sort(
      (a, b) => {
        const numA = parseInt(getSplitLabelNumber(a), 10) || 0;
        const numB = parseInt(getSplitLabelNumber(b), 10) || 0;
        return numA - numB;
      }
    );

    const rows = LOTTERY_ORDER.map((code) => {
      const lotterySplits = filteredSpecialSplits.filter(
        (s) => normalizeLotteryCode(s.lottery_code) === code
      );

      const lotteryName =
        lotterySplits[0]?.lottery_name || LOTTERY_NAME_MAP[code] || code;

      const remainingItem = remainingCounts.find(
        (r) => normalizeLotteryCode(r.lottery_code) === code
      );

      const assignmentItem = assignedCounts.find(
        (a) => normalizeLotteryCode(a.lottery_code) === code
      );

      const drawNumber =
        lotterySplits[0]?.draw_number ||
        remainingItem?.draw_number ||
        assignmentItem?.draw_number ||
        "";

      const splitData = {};
      labels.forEach((label) => {
        const match = lotterySplits.find((s) => s.label === label);
        splitData[label] = match || null;
      });

      const initialAssigned = Number(remainingItem?.original_assigned || 0);

      return {
        key: code,
        lottery_code: code,
        lottery_name: lotteryName,
        draw_number: drawNumber,
        initial_assigned: initialAssigned,
        splitData,
        remaining: Number(remainingItem?.remaining_count || 0),
      };
    }).filter((row) => {
      if (specialFilterType === "by_lottery" && specialFilterValue) {
        return row.lottery_code === specialFilterValue;
      }
      return true;
    });

    return { labels, rows };
  }, [
    filteredSpecialSplits,
    remainingCounts,
    assignedCounts,
    specialFilterType,
    specialFilterValue,
  ]);

  const totalInitialInMatrix = useMemo(() => {
    return specialSplitMatrix.rows.reduce(
      (sum, r) => sum + Number(r.initial_assigned || 0),
      0
    );
  }, [specialSplitMatrix.rows]);

  const totalRemainingInMatrix = useMemo(() => {
    return specialSplitMatrix.rows.reduce(
      (sum, r) => sum + Number(r.remaining || 0),
      0
    );
  }, [specialSplitMatrix.rows]);

  const splitTotals = useMemo(() => {
    const totals = {};
    specialSplitMatrix.labels.forEach((label) => {
      totals[label] = specialSplitMatrix.rows.reduce((sum, row) => {
        const data = row.splitData[label];
        return sum + (data ? Number(data.record_count || 0) : 0);
      }, 0);
    });
    return totals;
  }, [specialSplitMatrix]);

  const performSplit = async () => {
    setSplitting(true);
    try {
      await splitForAgent({
        session_id: sessionId,
        agent_name: agent,
        assignment_date: selectedDate,
      });
      messageApi.success(`DBF files split successfully for ${agent}.`);
      await checkInitialSplit(selectedDate, agent);
      await loadSpecialSplits(selectedDate, agent);
      await loadRemainingCounts(selectedDate, agent);
      navigate("/download");
    } catch (err) {
      console.error("Split failed:", err);
      const errorMessage =
        err.response?.data?.detail || err.response?.data?.message || "Split failed. Please try again.";
      messageApi.error(errorMessage);
      throw err;
    } finally {
      setSplitting(false);
    }
  };

  const handleSplit = () => {
    if (!sessionId) {
      messageApi.warning("No uploaded archive exists for this date.");
      return;
    }
    if (!validation?.is_valid) {
      messageApi.error("The archive contains validation errors. Fix the order quantities or upload the correct archive first.");
      return;
    }
    if (!assignedCounts.length) {
      messageApi.warning(`No assignments were found for ${agent}.`);
      return;
    }
    if (totalAssignedToAgent <= 0) {
      messageApi.warning(`No ticket quantities are assigned to ${agent}.`);
      return;
    }
    modalApi.confirm({
      title: `Split DBF files for ${agent}?`,
      icon: <ScissorOutlined style={{ color: agent === "JAYAWAY" ? "#722ed1" : "#13c2c2" }} />,
      centered: true,
      width: 520,
      content: (
        <div style={{ marginTop: 16 }}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Agent">
              <Tag color={agent === "JAYAWAY" ? "purple" : "cyan"}>{agent}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Date">
              <Text strong>{dayjs(selectedDate).format("DD MMMM YYYY")}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Lotteries">
              <Text strong>{assignedLotteryCount}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Assigned records">
              <Text strong>{totalAssignedToAgent.toLocaleString()}</Text>
            </Descriptions.Item>
          </Descriptions>
          <Alert
            type="info"
            showIcon
            message="The generated files will be available on the download page."
            style={{ marginTop: 16, borderRadius: 10 }}
          />
        </div>
      ),
      okText: "Split Files",
      cancelText: "Cancel",
      onOk: async () => {
        await performSplit();
      },
    });
  };

  const handleCreateSpecialSplit = () => {
    const counts = remainingCounts
      .map((item) => ({
        lottery_code: item.lottery_code,
        count: parseInt(specialCounts[item.lottery_code] || 0, 10),
      }))
      .filter((c) => c.count > 0);

    if (counts.length === 0) {
      messageApi.warning("Enter at least one record count.");
      return;
    }

    modalApi.confirm({
      title: "Create special split?",
      icon: <ScissorOutlined style={{ color: "#722ed1" }} />,
      centered: true,
      width: 480,
      content: (
        <div style={{ marginTop: 16 }}>
          <p>
            You are about to create a <strong>Special Split</strong> with the following records:
          </p>
          <ul style={{ paddingLeft: 20 }}>
            {counts.map((c) => (
              <li key={c.lottery_code}>
                {normalizeLotteryCode(c.lottery_code).toUpperCase()}: <strong>{c.count}</strong>
              </li>
            ))}
          </ul>
          <p>
            Total records to split: <strong>{counts.reduce((sum, c) => sum + c.count, 0)}</strong>
          </p>
          <p style={{ marginTop: 8 }}>
            <Text type="secondary">
              This will create a new special split (e.g., Special Split 1, 2, …) automatically.
            </Text>
          </p>
        </div>
      ),
      okText: "Create Special Split",
      cancelText: "Cancel",
      onOk: async () => {
        setCreatingSpecial(true);
        try {
          await createSpecialSplit({
            session_id: sessionId,
            agent_name: agent,
            assignment_date: selectedDate,
            counts,
          });
          messageApi.success("Special split created successfully.");
          setShowSpecialModal(false);
          setSpecialCounts({});
          loadSpecialSplits(selectedDate, agent);
          loadRemainingCounts(selectedDate, agent);
        } catch (err) {
          console.error("Failed to create special split:", err);
          messageApi.error(err.response?.data?.detail || "Failed to create special split.");
        } finally {
          setCreatingSpecial(false);
        }
      },
    });
  };

  const uploadedColumns = [
    {
      title: "#",
      key: "index",
      width: 45,
      align: "center",
      render: (_, __, index) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: "Ticket / Draw",
      key: "ticket",
      width: 240,
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.lottery_name || record.lottery_code || "Unknown"}
          </Text>
          <Tag
            color={record.draw_number ? "blue" : "default"}
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {record.draw_number ? `Draw ${record.draw_number}` : "No draw"}
          </Tag>
        </div>
      ),
    },
    {
      title: "Uploaded",
      dataIndex: "record_count",
      key: "record_count",
      width: 110,
      align: "right",
      render: (value) => <Text strong>{Number(value || 0).toLocaleString()}</Text>,
    },
    {
      title: "Ordered",
      key: "orderedQuantity",
      width: 110,
      align: "right",
      render: (_, record) => {
        const assignment = getAssignmentInfo(record);
        const availableQuantity = Number(assignment?.available_quantity || 0);
        return availableQuantity > 0 ? (
          <Text strong>{availableQuantity.toLocaleString()}</Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    },
    {
      title: "Serial Range",
      key: "serialRange",
      width: 240,
      render: (_, record) => (
        <div className="serial-range">
          <div>
            <Text type="secondary" className="serial-label">START</Text>
            <Text code>{record.start_serial || "—"}</Text>
          </div>
          <div style={{ marginTop: 5 }}>
            <Text type="secondary" className="serial-label">END</Text>
            <Text code>{record.end_serial || "—"}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      key: "validationStatus",
      width: 150,
      align: "center",
      render: (_, record) => {
        const mismatch = getMismatchInfo(record);
        const missing = getMissingInfo(record);
        const assignment = getAssignmentInfo(record);
        const uploadedRecords = Number(record.record_count || 0);
        const orderedQuantity = Number(assignment?.available_quantity || 0);
        if (missing) {
          return <Tag color="error" icon={<ExclamationCircleOutlined />}>Missing</Tag>;
        }
        if (mismatch) {
          const difference = Number(mismatch.difference ?? uploadedRecords - orderedQuantity);
          return (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              {difference > 0 ? `Mismatch +${difference}` : `Mismatch ${difference}`}
            </Tag>
          );
        }
        if (orderedQuantity > 0 && uploadedRecords === orderedQuantity) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Match</Tag>;
        }
        return <Tag color="warning">No Order</Tag>;
      },
    },
  ];

  const assignmentColumns = [
    {
      title: "#",
      key: "index",
      width: 45,
      align: "center",
      render: (_, __, index) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: "Ticket / Draw",
      key: "ticket",
      width: 250,
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.lottery_name || record.lottery_code || "Unknown"}
          </Text>
          <Tag
            color={record.draw_number ? "blue" : "default"}
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {record.draw_number ? `Draw ${record.draw_number}` : "No draw"}
          </Tag>
        </div>
      ),
    },
    {
      title: "Available",
      dataIndex: "available_quantity",
      key: "available_quantity",
      width: 130,
      align: "right",
      render: (value) => <Text strong>{Number(value || 0).toLocaleString()}</Text>,
    },
    {
      title: `Assigned to ${agent}`,
      dataIndex: "assigned_count",
      key: "assigned_count",
      width: 160,
      align: "right",
      render: (value) => {
        const numericValue = Number(value || 0);
        return numericValue > 0 ? (
          <Tag
            color={agent === "JAYAWAY" ? "purple" : "cyan"}
            style={{ minWidth: 70, textAlign: "center", fontWeight: 600 }}
          >
            {numericValue.toLocaleString()}
          </Tag>
        ) : (
          <Tag>Not assigned</Tag>
        );
      },
    },
    {
      title: "Allocation",
      key: "percentage",
      width: 220,
      render: (_, record) => {
        const available = Number(record.available_quantity || 0);
        const assigned = Number(record.assigned_count || 0);
        const percentage = available > 0 ? Math.min((assigned / available) * 100, 100) : 0;
        return (
          <Progress
            percent={Number(percentage.toFixed(1))}
            size="small"
            strokeColor={agent === "JAYAWAY" ? "#722ed1" : "#13c2c2"}
          />
        );
      },
    },
  ];

  const specialSplitColumns = [
    {
      title: "#",
      key: "index",
      width: 45,
      align: "center",
      render: (_, __, index) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: "Lottery",
      key: "lottery_name",
      render: (_, record) => (
        <Text strong>{record.lottery_name || record.lottery_code}</Text>
      ),
    },
    {
      title: "Draw",
      dataIndex: "draw_number",
      key: "draw_number",
      align: "center",
      render: (value) =>
        value ? (
          <Tag color="blue" style={{ margin: 0 }}>
            {value}
          </Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Remaining",
      dataIndex: "remaining_count",
      key: "remaining_count",
      align: "right",
      render: (value) => <Text strong>{Number(value || 0).toLocaleString()}</Text>,
    },
    {
      title: "Take",
      key: "take",
      align: "right",
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.remaining_count}
          value={specialCounts[record.lottery_code] || null}
          onChange={(val) =>
            setSpecialCounts((prev) => ({
              ...prev,
              [record.lottery_code]: val,
            }))
          }
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: "New Remaining",
      key: "new_remaining",
      align: "right",
      render: (_, record) => {
        const take = Number(specialCounts[record.lottery_code] || 0);
        const remaining = Number(record.remaining_count || 0);
        const newRemaining = Math.max(remaining - take, 0);
        return (
          <Text strong type={newRemaining === 0 ? "success" : "warning"}>
            {newRemaining.toLocaleString()}
          </Text>
        );
      },
    },
  ];

  return (
    <>
      {messageContextHolder}
      {modalContextHolder}

      <div className="split-page">
        <Card className="split-header-card" bordered={false}>
          <Row gutter={[20, 20]} align="middle" justify="space-between">
            <Col>
              <Space size={14} align="center">
                <div className="page-icon">
                  <ScissorOutlined />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0 }}>
                    Split DBF Files
                  </Title>
                  <Text type="secondary">
                    Validate uploaded DBF records and generate agent-specific files.
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space wrap>
                <Text type="secondary">Draw date:</Text>
                <DatePicker
                  value={selectedDate ? dayjs(selectedDate) : null}
                  onChange={handleDateChange}
                  allowClear={false}
                  format="DD MMM YYYY"
                  suffixIcon={<CalendarOutlined />}
                  style={{ width: 185 }}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {error && (
          <Alert
            showIcon
            closable
            type="error"
            message="Unable to load split data"
            description={error}
            onClose={() => setError("")}
            style={{ marginBottom: 20 }}
          />
        )}

        {validation && !validation.upload_exists && (
          <Alert
            type="warning"
            showIcon
            message="No archive uploaded"
            description="No DBF archive exists for this date. Upload the archive before splitting."
            style={{ marginBottom: 20 }}
          />
        )}

        {validation?.upload_exists && !validation?.is_valid && (
          <Alert
            type="error"
            showIcon
            message="Validation errors found"
            description={
              <Space direction="vertical" size={4}>
                <Text>Splitting is disabled until the errors are fixed.</Text>
                {mismatchCount > 0 && (
                  <Text type="danger">
                    Mismatches: <strong>{mismatchCount}</strong>
                  </Text>
                )}
                {missingCount > 0 && (
                  <Text type="danger">
                    Missing lotteries: <strong>{missingCount}</strong>
                  </Text>
                )}
                {extraCount > 0 && (
                  <Text style={{ color: "#d48806" }}>
                    Extra lotteries: <strong>{extraCount}</strong>
                  </Text>
                )}
              </Space>
            }
            style={{ marginBottom: 20 }}
          />
        )}

        {validation?.is_valid && (
          <Alert
            type="success"
            showIcon
            message="Archive validation completed"
            description="All uploaded records match the order quantities. The archive is ready to split."
            style={{ marginBottom: 20 }}
          />
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} xl={6}>
            <Card className="split-stat-card blue-stat" bordered={false}>
              <Statistic
                title="Uploaded Files"
                value={lotteries.length}
                suffix="/ 8"
                prefix={<DatabaseOutlined style={{ color: "#1677ff" }} />}
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card className="split-stat-card purple-stat" bordered={false}>
              <Statistic
                title="Uploaded Records"
                value={totalUploadedRecords}
                prefix={<DatabaseOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card
              className={agent === "JAYAWAY" ? "split-stat-card purple-stat" : "split-stat-card cyan-stat"}
              bordered={false}
            >
              <Statistic
                title={`${agent} Assigned`}
                value={totalAssignedToAgent}
                prefix={<UserOutlined style={{ color: agent === "JAYAWAY" ? "#722ed1" : "#13c2c2" }} />}
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card
              className={`split-stat-card ${
                validation?.is_valid ? "green-stat" : validation?.upload_exists ? "red-stat" : "orange-stat"
              }`}
              bordered={false}
            >
              <Statistic
                title="Validation Status"
                value={validation?.is_valid ? "Ready" : validation?.upload_exists ? "Errors" : "No upload"}
                prefix={
                  validation?.is_valid ? (
                    <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  ) : (
                    <WarningOutlined style={{ color: validation?.upload_exists ? "#ff4d4f" : "#fa8c16" }} />
                  )
                }
                valueStyle={{
                  fontWeight: 700,
                  color: validation?.is_valid ? "#52c41a" : validation?.upload_exists ? "#ff4d4f" : "#fa8c16",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          className="split-section-card"
          bordered={false}
          title={
            <Space size={10}>
              <div className="section-icon">
                <DatabaseOutlined />
              </div>
              <div>
                <Text strong style={{ display: "block", fontSize: 16 }}>
                  Uploaded File Validation
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Compare uploaded records against ordered quantities
                </Text>
              </div>
            </Space>
          }
          extra={
            <Space size={10}>
              {validation?.is_valid ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Ready
                </Tag>
              ) : (
                <Tag color="warning" icon={<WarningOutlined />}>
                  Check required
                </Tag>
              )}
              <Button
                type="text"
                className="details-button"
                icon={showValidationTable ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setShowValidationTable((prev) => !prev)}
              >
                {showValidationTable ? "Hide Details" : "View Details"}
              </Button>
            </Space>
          }
        >
          {showValidationTable && (
            <div className="validation-table-wrapper">
              <Table
                rowKey={(record, index) => `${record.lottery_code || record.lottery_name}-${index}`}
                columns={uploadedColumns}
                dataSource={lotteries}
                loading={loading}
                pagination={false}
                size="middle"
                scroll={{ x: 900 }}
                rowClassName={(record) => {
                  const mismatch = getMismatchInfo(record);
                  const missing = getMissingInfo(record);
                  return mismatch || missing ? "split-error-row" : "";
                }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={selectedDate ? "No uploaded archive found for this date" : "Select a draw date"}
                    />
                  ),
                }}
              />
            </div>
          )}
          {!showValidationTable && (
            <div className="validation-collapsed">
              <div className="validation-summary">
                <div>
                  <Text type="secondary">Uploaded</Text>
                  <Text strong>{totalUploadedRecords.toLocaleString()}</Text>
                </div>
                <div>
                  <Text type="secondary">Mismatches</Text>
                  <Text strong type={mismatchCount > 0 ? "danger" : undefined}>
                    {mismatchCount}
                  </Text>
                </div>
                <div>
                  <Text type="secondary">Missing</Text>
                  <Text strong type={missingCount > 0 ? "danger" : undefined}>
                    {missingCount}
                  </Text>
                </div>
                <div>
                  <Text type="secondary">Extra</Text>
                  <Text strong>{extraCount}</Text>
                </div>
              </div>
            </div>
          )}
        </Card>

        {sessionId && validation?.is_valid && (
          <>
            <Card className="split-agent-selector" bordered={false}>
              <Row gutter={[20, 20]} align="middle" justify="space-between">
                <Col>
                  <Space size={12}>
                    <div className="agent-select-icon">
                      <TeamOutlined />
                    </div>
                    <div>
                      <Text strong style={{ display: "block", fontSize: 15 }}>
                        Select split agent
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Choose the agent whose assigned DBF records should be generated.
                      </Text>
                    </div>
                  </Space>
                </Col>
                <Col>
                  <Select
                    value={agent}
                    onChange={setAgent}
                    className="agent-select"
                    options={[
                      { value: "JAYAWAY", label: "JAYAWAY" },
                      { value: "WINWAY", label: "WINWAY" },
                    ]}
                  />
                </Col>
              </Row>
            </Card>

            <Card
              className={`split-assignment-card ${agent === "JAYAWAY" ? "jayaway-card" : "winway-card"}`}
              bordered={false}
              title={
                <Space size={10}>
                  <div className={`agent-icon-box ${agent === "JAYAWAY" ? "jayaway-icon" : "winway-icon"}`}>
                    <UserOutlined />
                  </div>
                  <div>
                    <Text strong style={{ display: "block", fontSize: 16 }}>
                      {agent} Assignment
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {hasInitialSplit
                        ? "Initial split completed — assignment is finalized"
                        : "Assigned lottery quantities — click Split to generate files"}
                    </Text>
                  </div>
                </Space>
              }
              extra={
                assignedCounts.length > 0 && (
                  <Space size={12} wrap>
                    <Tag
                      color={agent === "JAYAWAY" ? "purple" : "cyan"}
                      className="record-count-tag"
                    >
                      {totalAssignedToAgent.toLocaleString()} Records
                    </Tag>

                    {!hasInitialSplit && (
                      <Button
                        type="primary"
                        icon={<ScissorOutlined />}
                        loading={splitting}
                        disabled={!canSplit || loadingAssignments}
                        onClick={handleSplit}
                        className={
                          agent === "JAYAWAY"
                            ? "split-action-btn jayaway-btn"
                            : "split-action-btn winway-btn"
                        }
                      >
                        Split for {agent}
                      </Button>
                    )}

                    <Button
                      type="text"
                      size="small"
                      icon={showAssignmentTable ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowAssignmentTable((p) => !p)}
                    >
                      {showAssignmentTable ? "Hide" : "Show"}
                    </Button>
                  </Space>
                )
              }
            >
              {showAssignmentTable ? (
                <Table
                  rowKey={(record, index) => `${record.lottery_code || record.lottery_name}-${index}`}
                  columns={assignmentColumns}
                  dataSource={assignedCounts}
                  loading={loadingAssignments}
                  pagination={false}
                  size="middle"
                  scroll={{ x: 850 }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <Text type="secondary">
                            No assignments found for <Text strong>{agent}</Text>
                          </Text>
                        }
                      />
                    ),
                  }}
                  summary={() =>
                    assignedCounts.length > 0 ? (
                      <Table.Summary>
                        <Table.Summary.Row className="summary-row">
                          <Table.Summary.Cell index={0} />
                          <Table.Summary.Cell index={1}>
                            <Text strong>Total</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <Text strong>{totalAvailableQuantity.toLocaleString()}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <Text strong style={{ color: agent === "JAYAWAY" ? "#722ed1" : "#13c2c2" }}>
                              {totalAssignedToAgent.toLocaleString()}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} />
                        </Table.Summary.Row>
                      </Table.Summary>
                    ) : null
                  }
                />
              ) : (
                <div className="assignment-collapsed-message">
                  <Space direction="vertical" align="center" style={{ width: "100%", padding: "20px 0" }}>
                    <CheckCircleOutlined style={{ fontSize: 28, color: "#52c41a" }} />
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Assignment for <Text strong>{agent}</Text> has already been split into{" "}
                      <Text strong>{totalAssignedToAgent.toLocaleString()}</Text> records.
                      Click <Text strong style={{ color: "#1677ff" }}>Show</Text> above to view details.
                    </Text>
                  </Space>
                </div>
              )}
            </Card>

            <Card
              className="special-splits-enhanced-card"
              bordered={false}
              style={{ marginTop: 20 }}
            >
              <div className="special-header">
                <div className="special-header-left">
                  <div className="special-header-icon">
                    <HistoryOutlined />
                  </div>
                  <div>
                    <div className="special-header-title">
                      <Text strong style={{ fontSize: 17 }}>
                        Special Splits
                      </Text>
                      {hasInitialSplit && uniqueSplitLabels.length > 0 && (
                        <Badge
                          count={uniqueSplitLabels.length}
                          style={{ backgroundColor: "#722ed1", marginLeft: 8 }}
                        />
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {hasInitialSplit
                        ? "Create sub-splits from the initial agent split and download them individually"
                        : "Complete the initial split first to unlock special splits"}
                    </Text>
                  </div>
                </div>

                {hasInitialSplit && (
                  <Space size={10} wrap>
                    <Select
                      value={specialFilterType}
                      onChange={(val) => {
                        setSpecialFilterType(val);
                        setSpecialFilterValue(null);
                      }}
                      style={{ width: 150 }}
                      options={[
                        { value: "all", label: "All Splits" },
                        { value: "by_split", label: "By Special Split" },
                        { value: "by_lottery", label: "By Lottery" },
                      ]}
                    />
                    {specialFilterType !== "all" && (
                      <Select
                        value={specialFilterValue}
                        onChange={setSpecialFilterValue}
                        style={{ width: 180 }}
                        placeholder="Select value"
                        options={filterValueOptions}
                      />
                    )}

                    <Tag
                      color="green"
                      style={{
                        margin: 0,
                        padding: "4px 12px",
                        borderRadius: 20,
                        fontWeight: 600,
                      }}
                    >
                      Available: {totalRemaining.toLocaleString()}
                    </Tag>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadSpecialZip}
                      disabled={!filteredSpecialSplits.length}
                    >
                      Special ZIP
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadRemainingZip}
                      disabled={totalRemaining === 0}
                    >
                      Remaining ZIP
                    </Button>
                    <Button
                      type="primary"
                      icon={<ScissorOutlined />}
                      onClick={() => setShowSpecialModal(true)}
                      disabled={!assignedCounts.length}
                      style={{
                        background:
                          "linear-gradient(135deg, #722ed1 0%, #9254de 100%)",
                        borderColor: "transparent",
                        fontWeight: 600,
                        boxShadow: "0 4px 12px rgba(114, 46, 209, 0.25)",
                      }}
                    >
                      + Create Special Split
                    </Button>
                  </Space>
                )}
              </div>

              {hasInitialSplit ? (
                <div className="special-table-wrapper">
                  <Table
                    rowKey={(record) => record.key}
                    dataSource={specialSplitMatrix.rows}
                    loading={loadingSpecials || loadingRemaining}
                    pagination={false}
                    size="middle"
                    bordered
                    scroll={{ x: 900 }}
                    className="special-matrix-table"
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No special splits created yet — click + Create Special Split to start"
                        />
                      ),
                    }}
                    columns={[
                      {
                        title: "Lottery",
                        dataIndex: "lottery_name",
                        key: "lottery_name",
                        width: 200,
                        fixed: "left",
                        render: (value, record) => (
                          <div>
                            <Text strong style={{ fontSize: 13, display: "block" }}>
                              {value}
                            </Text>
                            <Tag
                              color={record.draw_number ? "blue" : "default"}
                              style={{
                                margin: 0,
                                marginTop: 3,
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              {record.draw_number
                                ? `Draw ${record.draw_number}`
                                : "No draw"}
                            </Tag>
                          </div>
                        ),
                      },
                      {
                        title: (
                          <Tooltip title="Initial count assigned to this agent">
                            <span>Initial</span>
                          </Tooltip>
                        ),
                        dataIndex: "initial_assigned",
                        key: "initial_assigned",
                        width: 100,
                        align: "right",
                        className: "split-group-start",
                        render: (value) => (
                          <Text strong style={{ color: "#1677ff" }}>
                            {Number(value || 0).toLocaleString()}
                          </Text>
                        ),
                      },
                      ...specialSplitMatrix.labels.map((label) => ({
                        title: (
                          <Tag
                            color="geekblue"
                            style={{ margin: 0, fontWeight: 600 }}
                          >
                            Split {getSplitLabelNumber(label)}
                          </Tag>
                        ),
                        key: `group-${label}`,
                        className: "split-group-header",
                        children: [
                          {
                            title: "Records",
                            key: `${label}-records`,
                            width: 90,
                            align: "right",
                            className: "split-group-start",
                            render: (_, record) => {
                              const data = record.splitData[label];
                              return data ? (
                                <Text strong>
                                  {Number(data.record_count || 0).toLocaleString()}
                                </Text>
                              ) : (
                                <Text type="secondary">—</Text>
                              );
                            },
                          },
                          {
                            title: "Serial Range",
                            key: `${label}-serial`,
                            width: 210,
                            render: (_, record) => {
                              const data = record.splitData[label];
                              return data ? (
                                <Text code style={{ fontSize: 11 }}>
                                  {data.start_serial} – {data.end_serial}
                                </Text>
                              ) : (
                                <Text type="secondary">—</Text>
                              );
                            },
                          },
                        ],
                      })),
                      {
                        title: "Remaining",
                        key: "remaining",
                        width: 110,
                        align: "right",
                        fixed: "right",
                        className: "split-group-start",
                        render: (_, record) => (
                          <Text
                            strong
                            type={record.remaining === 0 ? "success" : "warning"}
                          >
                            {record.remaining.toLocaleString()}
                          </Text>
                        ),
                      },
                    ]}
                    summary={() => {
                      if (!specialSplitMatrix.labels.length) return null;
                      return (
                        <Table.Summary fixed>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0}>
                              <Text strong style={{ fontSize: 12, color: "#595959" }}>
                                TOTAL
                              </Text>
                            </Table.Summary.Cell>

                            <Table.Summary.Cell
                              index={1}
                              align="right"
                              className="split-group-start"
                            >
                              <Text
                                strong
                                style={{ color: "#1677ff", fontSize: 14 }}
                              >
                                {totalInitialInMatrix.toLocaleString()}
                              </Text>
                            </Table.Summary.Cell>

                            {specialSplitMatrix.labels.map((label, idx) => (
                              <Table.Summary.Cell
                                key={label}
                                index={idx * 2 + 2}
                                colSpan={2}
                                align="center"
                                className="split-group-start"
                              >
                                <Space direction="vertical" size={4}>
                                  <Button
                                    type="primary"
                                    ghost
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    onClick={() =>
                                      handleDownloadSpecialZipForLabel(label)
                                    }
                                    style={{
                                      borderColor: "#722ed1",
                                      color: "#722ed1",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Download Split {getSplitLabelNumber(label)}
                                  </Button>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11 }}
                                  >
                                    Total:{" "}
                                    <Text
                                      strong
                                      style={{ color: "#722ed1" }}
                                    >
                                      {(splitTotals[label] || 0).toLocaleString()}
                                    </Text>{" "}
                                    records
                                  </Text>
                                </Space>
                              </Table.Summary.Cell>
                            ))}

                            <Table.Summary.Cell
                              index={specialSplitMatrix.labels.length * 2 + 2}
                              align="right"
                              className="split-group-start"
                            >
                              <Text
                                strong
                                style={{
                                  fontSize: 14,
                                  color:
                                    totalRemainingInMatrix === 0
                                      ? "#52c41a"
                                      : "#fa8c16",
                                }}
                              >
                                {totalRemainingInMatrix.toLocaleString()}
                              </Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </div>
              ) : (
                <div className="special-collapsed-message">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        No special splits for this draw yet. Complete the initial split for{" "}
                        <Text strong>{agent}</Text> to enable special splits.
                      </Text>
                    }
                    style={{ margin: "24px 0" }}
                  />
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      <Modal
        title="Create Special Split"
        open={showSpecialModal}
        onCancel={() => {
          setShowSpecialModal(false);
          setSpecialCounts({});
        }}
        onOk={handleCreateSpecialSplit}
        okText="Create"
        confirmLoading={creatingSpecial}
        width={650}
        centered
      >
        <Text strong>
          Enter number of records to take from each lottery (max = remaining)
        </Text>
        <Table
          style={{ marginTop: 12 }}
          rowKey="lottery_code"
          dataSource={remainingCounts}
          pagination={false}
          size="small"
          columns={specialSplitColumns}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} />
                <Table.Summary.Cell index={1}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3} align="right">
                  <Text strong>{totalRemaining.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong>{totalSpecialTake.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text strong type={newRemainingTotal === 0 ? "success" : "warning"}>
                    {newRemainingTotal.toLocaleString()}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Modal>

      <style>{`
        .split-page { width: 100%; padding: 4px; }
        .split-header-card, .split-stat-card, .split-section-card, .split-agent-selector, .split-assignment-card {
          border: 1px solid #f0f0f0 !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 18px rgba(0,0,0,0.055) !important;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .split-header-card { margin-bottom: 20px; background: linear-gradient(135deg, #ffffff 0%, #f7faff 100%); }
        .split-header-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.07) !important; }
        .page-icon { width:48px; height:48px; display:flex; align-items:center; justify-content:center; flex-shrink:0; border-radius:14px; background:linear-gradient(135deg,#1677ff,#4096ff); color:white; font-size:21px; box-shadow:0 5px 14px rgba(22,119,255,0.22); }
        .split-stat-card { position:relative; height:100%; overflow:hidden; background:#ffffff; }
        .split-stat-card::before { content:""; position:absolute; left:0; top:0; width:4px; height:100%; opacity:0.85; }
        .split-stat-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,0,0,0.085) !important; }
        .blue-stat::before { background:#1677ff; }
        .purple-stat::before { background:#722ed1; }
        .cyan-stat::before { background:#13c2c2; }
        .green-stat::before { background:#52c41a; }
        .red-stat::before { background:#ff4d4f; }
        .orange-stat::before { background:#fa8c16; }
        .split-stat-card .ant-card-body { padding:20px 22px; }
        .split-stat-card .ant-statistic-title { margin-bottom:8px; color:#8c8c8c; font-size:13px; font-weight:500; }
        .split-stat-card .ant-statistic-content { font-size:25px; }
        .split-page .ant-alert { border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.025); }
        .split-section-card { margin-bottom:20px; overflow:hidden; background:#ffffff; }
        .split-section-card .ant-card-head { min-height:72px; padding:0 20px; border-bottom:1px solid #f2f2f2; }
        .section-icon { width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#e6f4ff; color:#1677ff; font-size:17px; }
        .details-button { height:36px; padding:0 10px !important; border-radius:8px !important; color:#1677ff !important; font-weight:500; }
        .details-button:hover { background:#e6f4ff !important; }
        .validation-collapsed { padding:4px 0; }
        .validation-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .validation-summary > div { padding:12px 14px; border:1px solid #f0f0f0; border-radius:10px; background:#fafafa; }
        .validation-summary > div > span { display:block; }
        .validation-summary > div > span:last-child { margin-top:3px; font-size:17px; }
        .validation-table-wrapper { margin:-24px; animation:validationOpen 0.25s ease; }
        @keyframes validationOpen { from { opacity:0; transform:translateY(-7px); } to { opacity:1; transform:translateY(0); } }
        .split-page .ant-table-thead > tr > th { background:#fafcff !important; color:#595959; font-size:12px; font-weight:600; border-bottom:1px solid #edf0f5; }
        .split-page .ant-table-tbody > tr > td { transition:background 0.18s ease; }
        .split-page .ant-table-tbody > tr:hover > td { background:#f8fbff !important; }
        .split-error-row > td { background:#fff2f0 !important; }
        .split-error-row:hover > td { background:#ffe7e5 !important; }
        .serial-range > div { display:flex; align-items:center; gap:8px; }
        .serial-label { display:inline-block; width:36px; font-size:9px; font-weight:600; }
        .split-agent-selector { margin-bottom:20px; background:linear-gradient(135deg,#ffffff,#fafcff); }
        .split-agent-selector:hover { border-color:#d6e4ff !important; }
        .agent-select-icon { width:38px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#e6f4ff; color:#1677ff; font-size:18px; }
        .agent-select { width:190px; }
        .agent-select .ant-select-selector { min-height:40px !important; display:flex; align-items:center; border-radius:10px !important; font-weight:600; }
        .split-assignment-card { overflow:hidden; background:#ffffff; }
        .split-assignment-card.jayaway-card { border-top:3px solid #722ed1 !important; }
        .split-assignment-card.winway-card { border-top:3px solid #13c2c2 !important; }
        .split-assignment-card .ant-card-head { min-height:74px; padding:0 20px; border-bottom:1px solid #f0f0f0; }
        .split-assignment-card .ant-card-body { padding:0; }
        .agent-icon-box { width:38px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:11px; font-size:17px; }
        .jayaway-icon { background:#f9f0ff; color:#722ed1; }
        .winway-icon { background:#e6fffb; color:#13c2c2; }
        .record-count-tag { margin:0 !important; padding:5px 11px; border-radius:20px; font-weight:600; }
        .split-action-btn { min-width:165px; height:38px; border-radius:9px !important; font-weight:600; transition:transform 0.18s ease, box-shadow 0.18s ease !important; }
        .split-action-btn:not(:disabled):hover { transform:translateY(-1px); }
        .jayaway-btn { background:#722ed1 !important; border-color:#722ed1 !important; }
        .jayaway-btn:not(:disabled):hover { background:#9254de !important; border-color:#9254de !important; box-shadow:0 5px 16px rgba(114,46,209,0.22) !important; }
        .winway-btn { background:#13c2c2 !important; border-color:#13c2c2 !important; }
        .winway-btn:not(:disabled):hover { background:#36cfc9 !important; border-color:#36cfc9 !important; box-shadow:0 5px 16px rgba(19,194,194,0.22) !important; }
        .summary-row > td { background:#fafafa !important; border-top:1px solid #e8e8e8; padding-top:14px !important; padding-bottom:14px !important; }
        .split-page .ant-tag { border-radius:7px; font-weight:500; }
        .split-page .ant-btn { transition:transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
        .split-page .ant-btn:not(:disabled):hover { transform:translateY(-1px); }
        .split-page .ant-picker { min-height:40px; border-radius:10px; transition:border-color 0.2s ease, box-shadow 0.2s ease; }
        .split-page .ant-picker-focused { box-shadow:0 0 0 3px rgba(22,119,255,0.08); }

        .assignment-collapsed-message {
          padding: 24px;
          background: linear-gradient(135deg, #f6ffed 0%, #f0f9f0 100%);
          text-align: center;
        }

        .special-splits-enhanced-card {
          border: 1px solid #f0f0f0 !important;
          border-radius: 16px !important;
          overflow: hidden;
          background: linear-gradient(135deg, #ffffff 0%, #fafbff 100%);
          box-shadow: 0 6px 24px rgba(114, 46, 209, 0.08) !important;
          transition: box-shadow 0.25s ease;
        }
        .special-splits-enhanced-card:hover {
          box-shadow: 0 10px 32px rgba(114, 46, 209, 0.12) !important;
        }
        .special-splits-enhanced-card .ant-card-body { padding: 0; }

        .special-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          padding: 20px 24px;
          background: linear-gradient(135deg, #f9f0ff 0%, #f0f5ff 100%);
          border-bottom: 1px solid #f0e7ff;
        }
        .special-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }
        .special-header-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #722ed1, #9254de);
          color: white;
          font-size: 20px;
          box-shadow: 0 6px 16px rgba(114, 46, 209, 0.30);
        }
        .special-header-title { display: flex; align-items: center; }

        .special-table-wrapper {
          padding: 20px 24px 24px;
          overflow-x: auto;
        }

        .special-collapsed-message {
          padding: 20px 24px 24px;
        }

        .special-splits-enhanced-card .ant-table {
          border-radius: 12px;
          overflow: hidden;
        }
        .special-splits-enhanced-card .ant-table-thead > tr > th {
          background: #f5f0ff !important;
          color: #531dab;
          font-size: 12px;
          font-weight: 700;
          border-bottom: 1px solid #e6d9ff !important;
        }
        .special-splits-enhanced-card .ant-table-thead > tr:first-child > th {
          background: #ede4ff !important;
        }
        .special-splits-enhanced-card .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f5f5f5 !important;
        }
        .special-splits-enhanced-card .ant-table-tbody > tr:hover > td {
          background: #fbf7ff !important;
        }
        .special-splits-enhanced-card .ant-table-summary > tr > td {
          background: #fafcff !important;
          border-top: 2px solid #e6f4ff !important;
          font-weight: 600;
        }

        .special-matrix-table .split-group-start {
          border-left: 2px solid #e6d9ff !important;
        }
        .special-matrix-table .split-group-header {
          border-left: 2px solid #e6d9ff !important;
        }
        .special-matrix-table .ant-table-thead > tr:first-child > th.split-group-header {
          background: #e6d9ff !important;
          color: #531dab;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .split-page { padding: 0; }
          .split-header-card .ant-card-body { padding: 18px; }
          .split-stat-card .ant-card-body { padding: 17px; }
          .validation-summary { grid-template-columns: repeat(2, 1fr); }
          .split-section-card .ant-card-head,
          .split-assignment-card .ant-card-head { padding: 12px 16px; }
          .agent-select { width: 100%; min-width: 160px; }

          .special-header {
            padding: 16px 18px;
            flex-direction: column;
            align-items: flex-start;
          }
          .special-table-wrapper { padding: 16px; }
          .special-collapsed-message { padding: 16px; }
        }
        @media (max-width: 480px) {
          .validation-summary { grid-template-columns: 1fr 1fr; }
          .record-count-tag { display: none; }
          .split-action-btn { min-width: 140px; }
          .special-header-icon { width: 40px; height: 40px; font-size: 17px; }
        }
      `}</style>
    </>
  );
};

export default SplitPage;