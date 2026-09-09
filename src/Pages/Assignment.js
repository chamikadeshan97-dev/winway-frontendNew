import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  getAssignments,
  saveAssignments,
  getLatestOrderDate,
  getLatestAssignmentDate,
} from "./api/index";

const { Title, Text } = Typography;

const LOTTERY_ORDER = [
  "ada",
  "dana",
  "govi",
  "hada",
  "maha",
  "mgap",
  "jaya",
  "suba",
];

const CountInput = ({ record, agent, disabled = false, onChange }) => (
  <InputNumber
    min={0}
    precision={0}
    disabled={disabled}
    value={
      record.agent_counts?.[agent] === 0
        ? null
        : record.agent_counts?.[agent] ?? null
    }
    onChange={(value) => onChange(record.lottery_code, agent, value)}
    style={{ width: 80 }}
  />
);

const Assignment = () => {
  const [date, setDate] = useState("");
  const [data, setData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New states for fetching last assignments
  const [fetchLastAssignmentsChecked, setFetchLastAssignmentsChecked] =
    useState(false);
  const [fetchingLastAssignments, setFetchingLastAssignments] = useState(false);

  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    loadLatestDate();
  }, []);

  const loadLatestDate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getLatestOrderDate();
      const latestDate = response.data?.date;

      if (latestDate) {
        setDate(latestDate);
        await loadData(latestDate);
      } else {
        const today = dayjs().format("YYYY-MM-DD");
        setDate(today);
        await loadData(today);
      }
    } catch (err) {
      console.error("Failed to load latest assignment date:", err);
      const today = dayjs().format("YYYY-MM-DD");
      setDate(today);
      await loadData(today);
    } finally {
      setLoading(false);
    }
  };

  const allAutoAssigned =
    data.length > 0 && data.every((item) => item.assignRemaining);

  const handleAutoAssignAll = () => {
    const shouldEnable = !allAutoAssigned;

    setData((previousData) =>
      previousData.map((item) => {
        const availableQuantity = Number(item.available_quantity || 0);
        const jayawayCount = Number(item.agent_counts?.JAYAWAY || 0);
        const currentWinwayCount = Number(item.agent_counts?.WINWAY || 0);
        const winwayRemaining = Math.max(availableQuantity - jayawayCount, 0);

        return {
          ...item,
          assignRemaining: shouldEnable,
          agent_counts: {
            ...item.agent_counts,
            WINWAY: shouldEnable ? winwayRemaining : currentWinwayCount,
          },
        };
      }),
    );

    messageApi.success(
      shouldEnable
        ? "Auto assignment enabled for all lotteries."
        : "Auto assignment disabled for all lotteries.",
    );
  };

  // New function: fetch last assignments and copy counts/auto flags
  const handleFetchLastAssignments = async (checked) => {
    setFetchLastAssignmentsChecked(checked);

    if (!checked) return;

    if (!date) {
      messageApi.warning("Please select a date first.");
      return;
    }

    setFetchingLastAssignments(true);

    try {
      const latestResponse = await getLatestAssignmentDate();
      const latestDate = latestResponse.data?.date;

      if (!latestDate || latestDate === date) {
        messageApi.warning("No previous assignment available.");
        return;
      }

      const previousResponse = await getAssignments(latestDate);
      const previousAssignments = Array.isArray(previousResponse.data)
        ? previousResponse.data
        : [];

      if (!previousAssignments.length) {
        messageApi.warning("No previous assignments found.");
        return;
      }

      // Build lookup: lottery_code -> { JAYAWAY, WINWAY, assignRemaining }
      const assignmentMap = {};
      previousAssignments.forEach((prev) => {
        const code = String(prev.lottery_code || "").toLowerCase();
        assignmentMap[code] = {
          JAYAWAY: Number(prev.agent_counts?.JAYAWAY || 0),
          WINWAY: Number(prev.agent_counts?.WINWAY || 0),
          assignRemaining: Boolean(prev.assignRemaining),
        };
      });

      setData((currentData) =>
        currentData.map((item) => {
          const code = String(item.lottery_code || "").toLowerCase();
          const prev = assignmentMap[code];
          if (!prev) return item;

          return {
            ...item,
            assignRemaining: prev.assignRemaining,
            agent_counts: {
              JAYAWAY: prev.JAYAWAY,
              WINWAY: prev.WINWAY,
            },
          };
        }),
      );

      messageApi.success("Last assignments fetched successfully.");
    } catch (error) {
      console.error("Failed to fetch last assignments:", error);
      messageApi.error("Failed to fetch last assignments.");
    } finally {
      setFetchingLastAssignments(false);
      setFetchLastAssignmentsChecked(false);
    }
  };

  const loadData = async (selectedDate) => {
    if (!selectedDate) return;

    setLoading(true);
    setError("");

    try {
      const response = await getAssignments(selectedDate);
      const assignmentData = Array.isArray(response.data) ? response.data : [];

      const sortedData = [...assignmentData].sort((a, b) => {
        const codeA = String(a.lottery_code || "").toLowerCase();
        const codeB = String(b.lottery_code || "").toLowerCase();

        const indexA = LOTTERY_ORDER.indexOf(codeA);
        const indexB = LOTTERY_ORDER.indexOf(codeB);

        const safeIndexA = indexA === -1 ? LOTTERY_ORDER.length : indexA;
        const safeIndexB = indexB === -1 ? LOTTERY_ORDER.length : indexB;

        return safeIndexA - safeIndexB;
      });

      const normalizedData = sortedData.map((item) => ({
        ...item,
        available_quantity: Number(item.available_quantity || 0),
        assignRemaining: Boolean(item.assignRemaining),
        agent_counts: {
          JAYAWAY: Number(item.agent_counts?.JAYAWAY || 0),
          WINWAY: Number(item.agent_counts?.WINWAY || 0),
        },
      }));

      setData(normalizedData);
    } catch (err) {
      console.error("Failed to load assignments:", err);
      setData([]);
      setError("Failed to load assignments for the selected date.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (selectedDay) => {
    if (!selectedDay) return;
    const formattedDate = selectedDay.format("YYYY-MM-DD");
    setDate(formattedDate);
    await loadData(formattedDate);
  };

  const handleCountChange = (lotteryCode, agent, value) => {
    const count = Math.max(Number(value || 0), 0);

    setData((previousData) =>
      previousData.map((item) => {
        if (item.lottery_code !== lotteryCode) return item;

        const updatedAgentCounts = {
          ...item.agent_counts,
          [agent]: count,
        };

        if (agent === "JAYAWAY" && item.assignRemaining) {
          const availableQuantity = Number(item.available_quantity || 0);
          const winwayRemaining = Math.max(availableQuantity - count, 0);
          updatedAgentCounts.WINWAY = winwayRemaining;
        }

        return {
          ...item,
          agent_counts: updatedAgentCounts,
        };
      }),
    );
  };

  const handleAssignRemainingToggle = (lotteryCode, checked) => {
    setData((previousData) =>
      previousData.map((item) => {
        if (item.lottery_code !== lotteryCode) return item;

        const jayaCount = Number(item.agent_counts?.JAYAWAY || 0);
        const currentWinwayCount = Number(item.agent_counts?.WINWAY || 0);
        const availableQuantity = Number(item.available_quantity || 0);
        const remainingAfterJaya = Math.max(availableQuantity - jayaCount, 0);

        return {
          ...item,
          assignRemaining: checked,
          agent_counts: {
            ...item.agent_counts,
            WINWAY: checked ? remainingAfterJaya : currentWinwayCount,
          },
        };
      }),
    );
  };

  const totalAvailable = useMemo(() => {
    return data.reduce(
      (total, item) => total + Number(item.available_quantity || 0),
      0,
    );
  }, [data]);

  const totalJayaway = useMemo(() => {
    return data.reduce(
      (total, item) => total + Number(item.agent_counts?.JAYAWAY || 0),
      0,
    );
  }, [data]);

  const totalWinway = useMemo(() => {
    return data.reduce(
      (total, item) => total + Number(item.agent_counts?.WINWAY || 0),
      0,
    );
  }, [data]);

  const totalAssigned = totalJayaway + totalWinway;
  const totalRemaining = totalAvailable - totalAssigned;

  const assignmentPercentage =
    totalAvailable > 0
      ? Math.min((totalAssigned / totalAvailable) * 100, 100)
      : 0;

  const invalidRows = useMemo(() => {
    return data.filter((item) => {
      const available = Number(item.available_quantity || 0);
      const jayaway = Number(item.agent_counts?.JAYAWAY || 0);
      const winway = Number(item.agent_counts?.WINWAY || 0);
      return jayaway + winway > available;
    });
  }, [data]);

  const validateAssignments = () => {
    if (!date) {
      messageApi.warning("Please select an assignment date.");
      return false;
    }
    if (!data.length) {
      messageApi.warning("There are no assignments to save.");
      return false;
    }
    const hasInvalidCount = data.some((item) => {
      const jayaway = Number(item.agent_counts?.JAYAWAY || 0);
      const winway = Number(item.agent_counts?.WINWAY || 0);
      return (
        Number.isNaN(jayaway) ||
        Number.isNaN(winway) ||
        jayaway < 0 ||
        winway < 0
      );
    });
    if (hasInvalidCount) {
      messageApi.warning("Assignment quantities must be zero or greater.");
      return false;
    }
    if (invalidRows.length > 0) {
      messageApi.error(
        `${invalidRows.length} lottery assignment${
          invalidRows.length === 1 ? "" : "s"
        } exceed the available quantity.`,
      );
      return false;
    }
    return true;
  };

  const saveAssignmentData = async () => {
    setSaving(true);

    const assignments = [];
    data.forEach((item) => {
      Object.entries(item.agent_counts || {}).forEach(([agentName, count]) => {
        assignments.push({
          lottery_code: item.lottery_code,
          agent_name: agentName,
          count: Number(count || 0),
        });
      });
    });

    const payload = {
      assignment_date: date,
      assignments,
    };

    try {
      await saveAssignments(payload);
      messageApi.success({
        content: "Assignments saved successfully.",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      await loadData(date);
    } catch (err) {
      console.error("Failed to save assignments:", err);
      messageApi.error("Failed to save assignments. Please try again.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const isValid = validateAssignments();
    if (!isValid) return;

    modalApi.confirm({
      title: "Confirm agent assignments?",
      icon: <SaveOutlined style={{ color: "#1677ff" }} />,
      centered: true,
      width: 500,
      content: (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>
            Assignment date:{" "}
            <strong>{dayjs(date).format("DD MMMM YYYY")}</strong>
          </p>
          <p style={{ marginBottom: 8 }}>
            Available quantity:{" "}
            <strong>{totalAvailable.toLocaleString()}</strong>
          </p>
          <p style={{ marginBottom: 8 }}>
            JAYAWAY assigned: <strong>{totalJayaway.toLocaleString()}</strong>
          </p>
          <p style={{ marginBottom: 8 }}>
            WINWAY assigned: <strong>{totalWinway.toLocaleString()}</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            Remaining quantity:{" "}
            <strong
              style={{
                color:
                  totalRemaining < 0
                    ? "#ff4d4f"
                    : totalRemaining > 0
                      ? "#fa8c16"
                      : "#52c41a",
              }}
            >
              {totalRemaining.toLocaleString()}
            </strong>
          </p>
        </div>
      ),
      okText: "Confirm Assignments",
      cancelText: "Cancel",
      onOk: async () => {
        await saveAssignmentData();
      },
    });
  };

  const number = (value) => Number(value || 0);

  const getAssignment = (record) => {
    const available = number(record.available_quantity);
    const jayaway = number(record.agent_counts?.JAYAWAY);
    const winway = number(record.agent_counts?.WINWAY);
    return {
      available,
      jayaway,
      winway,
      assigned: jayaway + winway,
      remaining: available - jayaway - winway,
    };
  };

  const columns = [
    {
      title: "#",
      width: 25,
      align: "left",
      render: (_, __, index) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: "Ticket",
      dataIndex: "lottery_name",
      width: 150,
      render: (value, record) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e6f4ff",
              color: "#1677ff",
              fontWeight: 700,
            }}
          >
            {record.lottery_code?.slice(0, 2)?.toUpperCase()}
          </div>
          <div>
            <Text strong>{value || record.lottery_code}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.lottery_code}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Draw",
      dataIndex: "draw_number",
      width: 120,
      align: "center",
      render: (value) => (
        <Tag color={value ? "blue" : "default"}>{value || "No draw"}</Tag>
      ),
    },
    {
      title: "Available",
      dataIndex: "available_quantity",
      width: 50,
      align: "left",
      render: (value) => <Text strong>{number(value).toLocaleString()}</Text>,
    },
    {
      title: "JAYAWAY",
      width: 50,
      align: "left",
      render: (_, record) => (
        <CountInput
          record={record}
          agent="JAYAWAY"
          onChange={handleCountChange}
        />
      ),
    },
    {
      title: "WINWAY",
      width: 50,
      align: "left",
      render: (_, record) => (
        <CountInput
          record={record}
          agent="WINWAY"
          disabled={record.assignRemaining}
          onChange={handleCountChange}
        />
      ),
    },
    {
      title: "Remaining",
      width: 100,
      align: "left",
      render: (_, record) => {
        const { remaining } = getAssignment(record);
        if (remaining < 0) {
          return (
            <Tag color="error" icon={<WarningOutlined />}>
              {remaining.toLocaleString()}
            </Tag>
          );
        }
        if (remaining === 0) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Fully
            </Tag>
          );
        }
        return <Tag color="warning">{remaining.toLocaleString()}</Tag>;
      },
    },
    {
      title: "Auto",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={!!record.assignRemaining}
          onChange={(e) =>
            handleAssignRemainingToggle(record.lottery_code, e.target.checked)
          }
        >
          Auto
        </Checkbox>
      ),
    },
    {
      title: "Status",
      width: 120,
      align: "center",
      render: (_, record) => {
        const { available, assigned } = getAssignment(record);
        if (assigned > available) return <Tag color="error">Exceeded</Tag>;
        if (assigned === available && available > 0)
          return <Tag color="success">Complete</Tag>;
        if (assigned > 0) return <Tag color="processing">Partial</Tag>;
        return <Tag>Not assigned</Tag>;
      },
    },
  ];

  return (
    <>
      {messageContextHolder}
      {modalContextHolder}

      <div>
        <Card
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Row gutter={[20, 20]} align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                Agent Assignment
              </Title>
              <Text type="secondary">
                Assign available lottery quantities to JAYAWAY and WINWAY agents.
              </Text>
            </Col>
            <Col>
              <Space wrap>
                <Text type="secondary">Assignment date:</Text>
                <DatePicker
                  value={date ? dayjs(date) : null}
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
            message="Unable to load assignments"
            description={error}
            style={{ marginBottom: 24 }}
          />
        )}

        {invalidRows.length > 0 && (
          <Alert
            showIcon
            type="error"
            message="Assignment quantities exceeded"
            description={`${invalidRows.length} lottery assignment${
              invalidRows.length === 1 ? "" : "s"
            } exceed the available quantity. Reduce the agent quantities before saving.`}
            style={{ marginBottom: 24 }}
          />
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Available */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Statistic
                title="Available Quantity"
                value={totalAvailable}
                prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
                valueStyle={{ fontWeight: 700, fontSize: 22 }}
              />
            </Card>
          </Col>

          {/* JAYAWAY */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Statistic
                title="JAYAWAY Assigned"
                value={totalJayaway}
                prefix={<UserOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ fontWeight: 700, fontSize: 22 }}
              />
            </Card>
          </Col>

          {/* WINWAY */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Statistic
                title="WINWAY Assigned"
                value={totalWinway}
                prefix={<UserOutlined style={{ color: "#13c2c2" }} />}
                valueStyle={{ fontWeight: 700, fontSize: 22 }}
              />
            </Card>
          </Col>

          {/* Remaining */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Statistic
                title="Remaining"
                value={totalRemaining}
                prefix={
                  totalRemaining < 0 ? (
                    <WarningOutlined style={{ color: "#ff4d4f" }} />
                  ) : (
                    <CheckCircleOutlined
                      style={{
                        color: totalRemaining === 0 ? "#52c41a" : "#fa8c16",
                      }}
                    />
                  )
                }
                valueStyle={{
                  fontWeight: 700,
                  fontSize: 22,
                  color:
                    totalRemaining < 0
                      ? "#ff4d4f"
                      : totalRemaining === 0
                        ? "#52c41a"
                        : "#fa8c16",
                }}
              />
            </Card>
          </Col>

          {/* Progress */}
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
              styles={{
                body: { height: "100%", padding: 20, position: "relative" },
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${Math.min(assignmentPercentage, 100)}%`,
                  background:
                    totalRemaining < 0
                      ? "rgba(255, 77, 79, 0.14)"
                      : totalRemaining === 0
                        ? "rgba(82, 196, 26, 0.14)"
                        : "rgba(22, 119, 255, 0.12)",
                  borderRight:
                    assignmentPercentage > 0
                      ? `3px solid ${
                          totalRemaining < 0
                            ? "#ff4d4f"
                            : totalRemaining === 0
                              ? "#52c41a"
                              : "#1677ff"
                        }`
                      : "none",
                  transition: "width 0.4s ease",
                  zIndex: 0,
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <Text strong style={{ fontSize: 20, display: "block" }}>
                      Overall Assignment
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Ticket allocation progress
                    </Text>
                  </div>
                  <Text
                    strong
                    style={{
                      fontSize: 38,
                      color:
                        totalRemaining < 0
                          ? "#ff4d4f"
                          : totalRemaining === 0
                            ? "#52c41a"
                            : "#1677ff",
                    }}
                  >
                    {assignmentPercentage.toFixed(1)}%
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <TeamOutlined style={{ color: "#1677ff" }} />
              <span>Lottery Agent Assignments</span>
            </Space>
          }
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
          }}
          extra={
            data.length > 0 && (
              <Space>
                {/* New Checkbox for fetching last assignments */}
                <Checkbox
                  checked={fetchLastAssignmentsChecked}
                  onChange={(e) => handleFetchLastAssignments(e.target.checked)}
                  disabled={loading || !date || fetchingLastAssignments}
                >
                  Fetch last assignments
                </Checkbox>

                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={handleAutoAssignAll}
                  disabled={loading || !date}
                >
                  {allAutoAssigned ? "Uncheck Auto All" : "Auto Assign All"}
                </Button>

                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  disabled={loading || !date || invalidRows.length > 0}
                  onClick={handleSave}
                  style={{ minWidth: 210 }}
                >
                  Confirm Assignments
                </Button>
              </Space>
            )
          }
        >
          <Table
            rowKey={(record) => record.lottery_code}
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={false}
            scroll={{ x: 1000 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    date
                      ? "No assignments found for this date"
                      : "Select an assignment date"
                  }
                />
              ),
            }}
            summary={() =>
              data.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} />
                    <Table.Summary.Cell index={1}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} />
                    <Table.Summary.Cell index={3} align="right">
                      <Text strong>{totalAvailable.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <Text strong>{totalJayaway.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Text strong>{totalWinway.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">
                      <Text
                        strong
                        type={totalRemaining < 0 ? "danger" : undefined}
                      >
                        {totalRemaining.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} />
                    <Table.Summary.Cell index={8} />
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        </Card>
      </div>
    </>
  );
};

export default Assignment;