import React, { useMemo, useRef, useState, useEffect } from "react";

import {
  Table,
  Input,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Spin,
  Divider,
  message,
  Button,
  Typography,
  Space,
  Tooltip,
  Progress,
  List,
  Modal,
  Switch,
  Popconfirm,
  Alert,
} from "antd";

import {
  TeamOutlined,
  TrophyOutlined,
  GiftOutlined,
  RiseOutlined,
  ReloadOutlined,
  DownloadOutlined,
  WarningOutlined,
  DragOutlined,
  UserOutlined,
  MailOutlined,
  StopOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ClockCircleTwoTone,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  PictureOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  ArrowUpOutlined,
  MinusOutlined,
  ArrowDownOutlined,
  SendOutlined,
  DeleteOutlined,
  CodeOutlined,
} from "@ant-design/icons";

import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { ENV } from "../config/env";

const { Title, Text } = Typography;

const API_BASE = ENV.API_BASE_LOCAL;


// ============================================================
// HELPERS
// ============================================================

const normalizeMobile = (value) => {
  if (!value) return "";

  let mobile = String(value)
    .trim()
    .replace(/\D/g, "");

  // 94701526879 -> 0701526879
  if (
    mobile.startsWith("94") &&
    mobile.length === 11
  ) {
    mobile = `0${mobile.substring(2)}`;
  }

  // 701526879 -> 0701526879
  if (mobile.length === 9) {
    mobile = `0${mobile}`;
  }

  return mobile;
};


const normalizeTier = (value) => {
  if (!value) return "";

  const cleaned = String(value)
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

  const map = {
    platinum: "Platinum",
    gold: "Gold",
    silver: "Silver",
    blue: "Blue",
    warning: "Warning",
    rejected: "Rejected",
    removed: "Removed",
    "removed done": "Removed Done",
  };

  return map[cleaned.toLowerCase()] || cleaned;
};


const safeNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isNaN(number)
    ? fallback
    : number;
};


const tierRank = {
  Platinum: 7,
  Gold: 6,
  Silver: 5,
  Blue: 4,
  Warning: 3,
  Rejected: 2,
  Removed: 1,
  "Removed Done": 0,
};


const getEvaluationChangeStatus = (
  previousLevel,
  newLevel,
) => {
  if (
    !previousLevel &&
    newLevel
  ) {
    return "Initial Load";
  }

  if (
    previousLevel === newLevel
  ) {
    return "Same";
  }

  const oldRank =
    tierRank[previousLevel];

  const newRank =
    tierRank[newLevel];

  if (
    oldRank !== undefined &&
    newRank !== undefined
  ) {
    if (newRank > oldRank) {
      return "Upgraded";
    }

    if (newRank < oldRank) {
      return "Down";
    }
  }

  return "Same";
};


const displayMonth = (value) => {
  if (!value) return "-";

  return String(value).replace(/_/g, " ");
};


const monthStrToDate = (value) => {
  if (!value) {
    return new Date(0);
  }

  const [year, month] =
    String(value).split("_");

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const monthIndex =
    months.findIndex(
      (item) =>
        item.toLowerCase() ===
        month?.toLowerCase(),
    );

  return new Date(
    Number(year || 0),
    Math.max(monthIndex, 0),
    1,
  );
};


// ============================================================
// MAIN PAGE
// ============================================================

function LoyaltyEvaluationCustomers() {
  // ==========================================================
  // MAIN DATA
  // ==========================================================

  const [customers, setCustomers] =
    useState([]);

  const [filtered, setFiltered] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [
    selectedTier,
    setSelectedTier,
  ] = useState("");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState("");

  const [
    selectedResult,
    setSelectedResult,
  ] = useState("");

  const [
    pagination,
    setPagination,
  ] = useState({
    current: 1,
    pageSize: 10,
  });


  // ==========================================================
  // JSON MODAL
  // ==========================================================

  const [
    jsonModalOpen,
    setJsonModalOpen,
  ] = useState(false);

  const [
    jsonText,
    setJsonText,
  ] = useState("");


  // ==========================================================
  // CUSTOMER DETAIL MODAL
  // ==========================================================

  const [
    detailsOpen,
    setDetailsOpen,
  ] = useState(false);

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState(null);


  // ==========================================================
  // EMAIL
  // ==========================================================

  const [
    IS_TEST_MODE,
    Set_IS_TEST_MODE,
  ] = useState(true);

  const [
    sendingMailAll,
    setSendingMailAll,
  ] = useState(false);

  const [
    singleEmailModelVisible,
    setSingleEmailModelVisible,
  ] = useState(false);

  const [
    logModalVisible,
    setLogModalVisible,
  ] = useState(false);

  const [
    logList,
    setLogList,
  ] = useState([]);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const pausedRef =
    useRef(false);

  const stoppedRef =
    useRef(false);


  // ==========================================================
  // TIER STYLE
  // ==========================================================

  const tierColors = {
    Platinum: "#9B5DE5",

    Gold: "#E6B800",

    Silver: "#C0C0C0",

    Blue: "#2563EB",

    Warning: "#FFA500",

    Removed: "#E63946",

    Rejected: "#6b7280",

    "Removed Done": "#8f0000",
  };


  const tierColorsFade = {
    Platinum:
      "rgba(155, 93, 229, 0.2)",

    Gold:
      "rgba(230, 184, 0, 0.2)",

    Silver:
      "rgba(192, 192, 192, 0.2)",

    Blue:
      "rgba(37, 99, 235, 0.2)",

    Warning:
      "rgba(255, 165, 0, 0.2)",

    Removed:
      "rgba(230, 57, 70, 0.2)",

    Rejected:
      "rgba(107, 114, 128, 0.2)",

    "Removed Done":
      "rgba(242, 8, 8, 0.2)",
  };


  const tierIcons = {
    Platinum:
      <TrophyOutlined />,

    Gold:
      <GiftOutlined />,

    Silver:
      <RiseOutlined />,

    Blue:
      <RiseOutlined />,

    Warning:
      <WarningOutlined />,

    Rejected:
      <DragOutlined />,

    Removed:
      <DragOutlined />,

    "Removed Done":
      <DragOutlined />,
  };


  // ==========================================================
  // LOAD JSON
  // ==========================================================

  const handleLoadJson = () => {
    try {
      if (!jsonText.trim()) {
        message.warning(
          "Please paste the JSON first.",
        );

        return;
      }


      const parsed =
        JSON.parse(jsonText);


      /*
        Supported:

        {
          "members": [...]
        }

        OR

        [
          {...}
        ]
      */
      const members =
        Array.isArray(parsed)
          ? parsed
          : Array.isArray(
                parsed.members,
              )
            ? parsed.members
            : [];


      if (!members.length) {
        message.warning(
          'No "members" array found in the JSON.',
        );

        return;
      }


      const mapped =
        members.map(
          (member, index) => {
            const previousLevel =
              normalizeTier(
                member.previous_level,
              );


            const newLevel =
              normalizeTier(
                member.new_level,
              );


            const changeStatus =
              getEvaluationChangeStatus(
                previousLevel,
                newLevel,
              );


            return {
              key:
                `${member.mobile_number || "unknown"}-${index}`,


              // ==============================================
              // ROOT
              // ==============================================

              MobileNumber:
                member.mobile_number ||
                "",

              MobileNormalized:
                normalizeMobile(
                  member.mobile_number,
                ),

              Last_Update:
                member.last_update ||
                "",


              // ==============================================
              // KEEP ORIGINAL
              // ==============================================

              EvaluationData: {
                ...member,
              },


              // ==============================================
              // MAP INTO OLD PAGE STRUCTURE
              // ==============================================

              CustomerInfo: {
                FirstName:
                  member.first_name ||
                  "",

                LastName:
                  member.last_name ||
                  "",


                /*
                  JSON does not currently provide these.
                  Keep empty so page still works.
                */
                Email:
                  member.email ||
                  "",

                Gender:
                  member.gender ||
                  "",

                Loyalty_Number:
                  member.loyalty_number ||
                  "",


                // ============================================
                // LEVELS
                // ============================================

                lastMonthLoyaltyTier:
                  previousLevel,

                Current_Loyalty_Tier:
                  newLevel,


                // ============================================
                // TICKETS
                // ============================================

                Current_Ticket_Count:
                  safeNumber(
                    member.total_ticket_count,
                  ),

                Monthly_Ticket_Count:
                  safeNumber(
                    member.monthly_ticket_count,
                  ),

                Last_Month_Ticket_Count:
                  safeNumber(
                    member.last_month,
                  ),


                // ============================================
                // OUR UI CHANGE STATUS
                // ============================================

                Evaluation_Status:
                  changeStatus,


                // ============================================
                // ACTUAL BACKEND RESULT
                // ============================================

                Evaluation_Result:
                  member.evaluation_status ||
                  "",

                Evaluation_Reason:
                  member.reason ||
                  "",

                Level_Changed:
                  Boolean(
                    member.level_changed,
                  ),
              },
            };
          },
        );


      setCustomers(mapped);

      setFiltered(mapped);

      setSearchText("");

      setSelectedTier("");

      setSelectedStatus("");

      setSelectedResult("");

      setPagination({
        current: 1,
        pageSize: 10,
      });


      setJsonModalOpen(false);


      message.success(
        `${mapped.length} evaluation customers loaded successfully.`,
      );

    } catch (error) {
      console.error(
        "JSON parse error:",
        error,
      );

      message.error(
        "Invalid JSON. Please check the pasted data.",
      );
    }
  };


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const summary = useMemo(
    () => {
      const result = {
        totalCustomers:
          customers.length,

        totalTickets: 0,

        monthlyTickets: 0,

        tierCounts: {},

        new_customers: 0,

        same: 0,

        upgrades: 0,

        downgrades: 0,

        changed: 0,
      };


      customers.forEach(
        (customer) => {
          const info =
            customer.CustomerInfo ||
            {};


          const tier =
            info.Current_Loyalty_Tier ||
            "Unknown";


          result.tierCounts[tier] =
            (result.tierCounts[
              tier
            ] || 0) + 1;


          result.totalTickets +=
            safeNumber(
              info.Current_Ticket_Count,
            );


          result.monthlyTickets +=
            safeNumber(
              info.Monthly_Ticket_Count,
            );


          if (
            info.Level_Changed
          ) {
            result.changed++;
          }


          switch (
            info.Evaluation_Status
          ) {
            case "Initial Load":
              result.new_customers++;
              break;

            case "Upgraded":
              result.upgrades++;
              break;

            case "Same":
              result.same++;
              break;

            case "Down":
              result.downgrades++;
              break;

            default:
              break;
          }
        },
      );


      return result;
    },
    [customers],
  );


  // ==========================================================
  // MONTHS
  // ==========================================================

  const uniqueMonths =
    useMemo(() => {
      return [
        ...new Set(
          customers
            .map(
              (customer) =>
                customer.Last_Update,
            )
            .filter(Boolean),
        ),
      ].sort(
        (a, b) =>
          monthStrToDate(a) -
          monthStrToDate(b),
      );
    }, [customers]);


  const firstStages =
    uniqueMonths.slice(0, 1);

  const lastStages =
    uniqueMonths.slice(-1);


  // ==========================================================
  // FILTER
  // ==========================================================

  useEffect(() => {
    let result = [
      ...customers,
    ];


    // SEARCH
    if (searchText) {
      const search =
        searchText
          .trim()
          .toLowerCase();


      result = result.filter(
        (customer) => {
          const info =
            customer.CustomerInfo ||
            {};


          const fullName =
            `${info.FirstName || ""} ${
              info.LastName || ""
            }`.toLowerCase();


          return (
            String(
              customer.MobileNumber ||
                "",
            )
              .toLowerCase()
              .includes(search) ||

            String(
              customer.MobileNormalized ||
                "",
            )
              .toLowerCase()
              .includes(search) ||

            fullName.includes(
              search,
            ) ||

            String(
              info.Email || "",
            )
              .toLowerCase()
              .includes(search)
          );
        },
      );
    }


    // TIER
    if (selectedTier) {
      result = result.filter(
        (customer) =>
          customer.CustomerInfo
            ?.Current_Loyalty_Tier ===
          selectedTier,
      );
    }


    // CHANGE STATUS
    if (selectedStatus) {
      result = result.filter(
        (customer) =>
          customer.CustomerInfo
            ?.Evaluation_Status ===
          selectedStatus,
      );
    }


    // BACKEND RESULT
    if (selectedResult) {
      result = result.filter(
        (customer) =>
          String(
            customer.CustomerInfo
              ?.Evaluation_Result ||
              "",
          ).toUpperCase() ===
          selectedResult.toUpperCase(),
      );
    }


    setFiltered(result);


    setPagination(
      (previous) => ({
        ...previous,
        current: 1,
      }),
    );

  }, [
    customers,
    searchText,
    selectedTier,
    selectedStatus,
    selectedResult,
  ]);


  // ==========================================================
  // EMAIL SINGLE
  // ==========================================================

  const sendLoyaltyEmail =
    async (
      customer,
      type,
      index = 0,
    ) => {
      try {
        const formData =
          new FormData();


        const email =
          customer.CustomerInfo
            ?.Email;


        if (IS_TEST_MODE) {
          formData.append(
            "to",
            "chamikadeshan97@gmail.com",
          );
        } else {
          if (!email) {
            throw new Error(
              "Customer has no email.",
            );
          }


          formData.append(
            "to",
            email,
          );


          if (
            index <= 5 &&
            email
          ) {
            formData.append(
              "cc",
              "info@winway.lk",
            );
          }
        }


        formData.append(
          "name",
          `${
            customer.CustomerInfo
              ?.FirstName || ""
          } ${
            customer.CustomerInfo
              ?.LastName || ""
          }`,
        );


        formData.append(
          "type",
          type === "Initial Load"
            ? "loyalty_welcome"
            : type,
        );


        formData.append(
          "Loyalty_Number",
          customer.CustomerInfo
            ?.Loyalty_Number ||
            "",
        );


        formData.append(
          "customerData",
          JSON.stringify(
            customer,
          ),
        );


        await axios.post(
          `${API_BASE}/email/loyality/send-loyalty`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          },
        );


        return {
          status: "success",
        };

      } catch (error) {
        console.error(
          "Loyalty Email Error:",
          error,
        );


        return {
          status: "failed",
        };
      }
    };


  const handleSendSingleEmail =
    async (record) => {
      setSingleEmailModelVisible(
        true,
      );


      try {
        const result =
          await sendLoyaltyEmail(
            record,

            record.CustomerInfo
              ?.Evaluation_Status,
          );


        if (
          result.status ===
          "success"
        ) {
          message.success(
            "Email sent successfully.",
          );
        } else {
          message.error(
            "Failed to send email.",
          );
        }

      } finally {
        setSingleEmailModelVisible(
          false,
        );
      }
    };


  // ==========================================================
  // BULK EMAIL
  // ==========================================================

  const handleSendLoyaltyEmails =
    async (type) => {
      if (!filtered.length) {
        message.warning(
          "No customers found.",
        );

        return;
      }


      setSendingMailAll(true);

      setLogModalVisible(true);

      setLogList([]);

      setProgress(0);


      pausedRef.current =
        false;

      stoppedRef.current =
        false;


      const targetCustomers =
        IS_TEST_MODE
          ? filtered.slice(0, 10)
          : filtered;


      const total =
        targetCustomers.length;


      let sentCount = 0;


      for (
        let i = 0;
        i < total;
        i++
      ) {
        const customer =
          targetCustomers[i];


        if (
          stoppedRef.current
        ) {
          break;
        }


        while (
          pausedRef.current &&
          !stoppedRef.current
        ) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                400,
              ),
          );
        }


        const id =
          `${customer.MobileNumber}-${i}`;


        setLogList(
          (previous) => [
            ...previous,

            {
              id,

              name:
                `${
                  customer.CustomerInfo
                    ?.FirstName ||
                  ""
                } ${
                  customer.CustomerInfo
                    ?.LastName ||
                  ""
                }`,

              email:
                customer.CustomerInfo
                  ?.Email,

              status:
                "sending",
            },
          ],
        );


        const result =
          await sendLoyaltyEmail(
            customer,
            type,
            i,
          );


        sentCount++;


        setProgress(
          Math.round(
            (sentCount / total) *
              100,
          ),
        );


        setLogList(
          (previous) =>
            previous.map(
              (item) =>
                item.id === id
                  ? {
                      ...item,

                      status:
                        result.status,
                    }
                  : item,
            ),
        );


        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              500,
            ),
        );
      }


      setSendingMailAll(false);
    };


  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  const handleDownloadData =
    () => {
      if (!filtered.length) {
        message.warning(
          "No data to export.",
        );

        return;
      }


      const exportData =
        filtered.map(
          (item) => ({
            Mobile_Number:
              item.MobileNumber,

            First_Name:
              item.CustomerInfo
                ?.FirstName,

            Last_Name:
              item.CustomerInfo
                ?.LastName,

            Previous_Level:
              item.CustomerInfo
                ?.lastMonthLoyaltyTier,

            New_Level:
              item.CustomerInfo
                ?.Current_Loyalty_Tier,

            Total_Ticket_Count:
              item.CustomerInfo
                ?.Current_Ticket_Count,

            Monthly_Ticket_Count:
              item.CustomerInfo
                ?.Monthly_Ticket_Count,

            Last_Month:
              item.CustomerInfo
                ?.Last_Month_Ticket_Count,

            Last_Update:
              item.Last_Update,

            Change_Status:
              item.CustomerInfo
                ?.Evaluation_Status,

            Evaluation_Status:
              item.CustomerInfo
                ?.Evaluation_Result,

            Reason:
              item.CustomerInfo
                ?.Evaluation_Reason,

            Level_Changed:
              item.CustomerInfo
                ?.Level_Changed,
          }),
        );


      const worksheet =
        XLSX.utils.json_to_sheet(
          exportData,
        );


      const workbook =
        XLSX.utils.book_new();


      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Evaluation Members",
      );


      const buffer =
        XLSX.write(
          workbook,
          {
            bookType: "xlsx",
            type: "array",
          },
        );


      saveAs(
        new Blob([buffer]),

        `WINWAY_Loyalty_Evaluation_${
          new Date()
            .toISOString()
            .split("T")[0]
        }.xlsx`,
      );


      message.success(
        "Evaluation downloaded.",
      );
    };


  // ==========================================================
  // CLEAR
  // ==========================================================

  const clearEvaluation =
    () => {
      setCustomers([]);

      setFiltered([]);

      setJsonText("");

      setSearchText("");

      setSelectedTier("");

      setSelectedStatus("");

      setSelectedResult("");

      setPagination({
        current: 1,
        pageSize: 10,
      });


      message.success(
        "Evaluation data cleared.",
      );
    };


  // ==========================================================
  // TABLE COLUMNS
  // ==========================================================

  const columns = [
    {
      title: "Mobile Number",

      dataIndex:
        "MobileNumber",

      key:
        "MobileNumber",

      width: 145,

      fixed: "left",

      sorter: (a, b) =>
        String(
          a.MobileNumber || "",
        ).localeCompare(
          String(
            b.MobileNumber || "",
          ),
        ),

      render: (value) => (
        <Text strong>
          {value || "-"}
        </Text>
      ),
    },


    {
      title: "Name",

      key: "Name",

      width: 180,

      sorter: (a, b) => {
        const nameA =
          `${a.CustomerInfo?.FirstName || ""} ${
            a.CustomerInfo?.LastName || ""
          }`;


        const nameB =
          `${b.CustomerInfo?.FirstName || ""} ${
            b.CustomerInfo?.LastName || ""
          }`;


        return nameA.localeCompare(
          nameB,
        );
      },

      render: (_, record) =>
        `${record.CustomerInfo?.FirstName || ""} ${
          record.CustomerInfo?.LastName || ""
        }`,
    },


    {
      title: "Last Tier",

      key: "LastTier",

      width: 110,

      align: "center",

      sorter: (a, b) =>
        String(
          a.CustomerInfo
            ?.lastMonthLoyaltyTier ||
            "",
        ).localeCompare(
          String(
            b.CustomerInfo
              ?.lastMonthLoyaltyTier ||
              "",
          ),
        ),

      render: (_, record) => {
        const tier =
          record.CustomerInfo
            ?.lastMonthLoyaltyTier;


        return (
          <Tag
            color={
              tierColors[tier] ||
              "default"
            }

            style={{
              fontWeight: 500,
            }}
          >
            {tier || "-"}
          </Tag>
        );
      },
    },


    {
      title: "Current Tier",

      key: "CurrentTier",

      width: 115,

      align: "center",

      sorter: (a, b) =>
        String(
          a.CustomerInfo
            ?.Current_Loyalty_Tier ||
            "",
        ).localeCompare(
          String(
            b.CustomerInfo
              ?.Current_Loyalty_Tier ||
              "",
          ),
        ),

      render: (_, record) => {
        const tier =
          record.CustomerInfo
            ?.Current_Loyalty_Tier;


        return (
          <Tag
            color={
              tierColors[tier] ||
              "default"
            }

            style={{
              fontWeight: 600,
            }}
          >
            {tier || "-"}
          </Tag>
        );
      },
    },


    {
      title: "Tickets So Far",

      key: "TotalTickets",

      width: 110,

      align: "center",

      sorter: (a, b) =>
        safeNumber(
          a.CustomerInfo
            ?.Current_Ticket_Count,
        ) -
        safeNumber(
          b.CustomerInfo
            ?.Current_Ticket_Count,
        ),

      render: (_, record) => (
        <span
          style={{
            fontWeight: 600,
          }}
        >
          {safeNumber(
            record.CustomerInfo
              ?.Current_Ticket_Count,
          ).toLocaleString()}
        </span>
      ),
    },


    {
      title: "This Month",

      key: "MonthlyTickets",

      width: 105,

      align: "center",

      sorter: (a, b) =>
        safeNumber(
          a.CustomerInfo
            ?.Monthly_Ticket_Count,
        ) -
        safeNumber(
          b.CustomerInfo
            ?.Monthly_Ticket_Count,
        ),

      render: (_, record) => {
        const count =
          safeNumber(
            record.CustomerInfo
              ?.Monthly_Ticket_Count,
          );


        return (
          <span
            style={{
              fontWeight: 600,

              color:
                count >= 300
                  ? "#16a34a"
                  : "#dc2626",
            }}
          >
            {count.toLocaleString()}
          </span>
        );
      },
    },


    {
      title: "Last Month",

      key: "LastMonth",

      width: 105,

      align: "center",

      sorter: (a, b) =>
        safeNumber(
          a.CustomerInfo
            ?.Last_Month_Ticket_Count,
        ) -
        safeNumber(
          b.CustomerInfo
            ?.Last_Month_Ticket_Count,
        ),

      render: (_, record) => (
        <span
          style={{
            fontWeight: 500,
          }}
        >
          {safeNumber(
            record.CustomerInfo
              ?.Last_Month_Ticket_Count,
          ).toLocaleString()}
        </span>
      ),
    },


    {
      title: "Change",

      key: "Change",

      width: 105,

      align: "center",

      sorter: (a, b) =>
        String(
          a.CustomerInfo
            ?.Evaluation_Status ||
            "",
        ).localeCompare(
          String(
            b.CustomerInfo
              ?.Evaluation_Status ||
              "",
          ),
        ),

      render: (_, record) => {
        const status =
          record.CustomerInfo
            ?.Evaluation_Status;


        if (
          status ===
          "Upgraded"
        ) {
          return (
            <Tag
              color="success"

              icon={
                <ArrowUpOutlined />
              }
            >
              Up
            </Tag>
          );
        }


        if (
          status === "Down"
        ) {
          return (
            <Tag
              color="error"

              icon={
                <ArrowDownOutlined />
              }
            >
              Down
            </Tag>
          );
        }


        if (
          status ===
          "Initial Load"
        ) {
          return (
            <Tag color="blue">
              New
            </Tag>
          );
        }


        return (
          <Tag
            icon={
              <MinusOutlined />
            }
          >
            Same
          </Tag>
        );
      },
    },


    {
      title: "Evaluation",

      key:
        "EvaluationResult",

      width: 125,

      align: "center",

      render: (_, record) => {
        const result =
          record.CustomerInfo
            ?.Evaluation_Result ||
          "-";


        const normalized =
          normalizeTier(
            result,
          );


        return (
          <Tag
            color={
              tierColors[
                normalized
              ] ||
              "processing"
            }
          >
            {String(
              result,
            ).replace(
              /_/g,
              " ",
            )}
          </Tag>
        );
      },
    },


    {
      title: "Reason",

      key: "Reason",

      width: 280,

      ellipsis: true,

      render: (_, record) => {
        const reason =
          record.CustomerInfo
            ?.Evaluation_Reason ||
          "-";


        return (
          <Tooltip
            title={reason}
          >
            <Text>
              {reason}
            </Text>
          </Tooltip>
        );
      },
    },


    {
      title: "Changed",

      key: "LevelChanged",

      width: 95,

      align: "center",

      render: (_, record) =>
        record.CustomerInfo
          ?.Level_Changed ? (
          <Tag
            color="success"

            icon={
              <CheckCircleOutlined />
            }
          >
            Yes
          </Tag>
        ) : (
          <Tag>
            No
          </Tag>
        ),
    },


    {
      title: "Last Update",

      dataIndex:
        "Last_Update",

      key:
        "Last_Update",

      width: 130,

      align: "center",

      sorter: (a, b) =>
        monthStrToDate(
          a.Last_Update,
        ) -
        monthStrToDate(
          b.Last_Update,
        ),

      render: (value) =>
        displayMonth(
          value,
        ),
    },


    {
      title: "Action",

      key: "action",

      fixed: "right",

      width: 155,

      align: "center",

      render: (_, record) => (
        <Space>
          <Button
            size="small"

            onClick={(event) => {
              event.stopPropagation();

              setSelectedCustomer(
                record,
              );

              setDetailsOpen(
                true,
              );
            }}
          >
            View
          </Button>


          <Button
            size="small"

            loading={
              sendingMailAll
            }

            icon={
              <SendOutlined />
            }

            type="primary"

            style={{
              background:
                "#7b2ff7",

              borderColor:
                "#7b2ff7",
            }}

            onClick={(event) => {
              event.stopPropagation();

              handleSendSingleEmail(
                record,
              );
            }}
          >
            Send
          </Button>
        </Space>
      ),
    },
  ];


  // ==========================================================
  // EMAIL CONTROLS
  // ==========================================================

  const handlePause = () => {
    pausedRef.current = true;
  };


  const handleResume = () => {
    pausedRef.current = false;
  };


  const handleStop = () => {
    stoppedRef.current = true;

    pausedRef.current = false;

    setLogModalVisible(false);

    message.info(
      "Email sending stopped.",
    );
  };


  const successCount =
    logList.filter(
      (item) =>
        item.status ===
        "success",
    ).length;


  const failCount =
    logList.filter(
      (item) =>
        item.status ===
        "failed",
    ).length;


  const imageCount =
    logList.filter(
      (item) =>
        item.status ===
        "image",
    ).length;


  // ==========================================================
  // RETURN
  // ==========================================================

  return (
    <>
      <Spin
        spinning={
          loading ||
          singleEmailModelVisible
        }

        tip={
          singleEmailModelVisible
            ? "Sending Email..."
            : "Loading..."
        }
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <Row
          justify="space-between"

          align="middle"

          gutter={[16, 16]}

          style={{
            marginBottom: 12,
          }}
        >
          <Col>
            <Title
              level={3}

              style={{
                margin: 0,
              }}
            >
              Loyalty Evaluation Customers
            </Title>


            <Text type="secondary">
              Paste monthly evaluation
              JSON and manage evaluated
              loyalty customers
            </Text>
          </Col>


          <Col>
            <Space wrap>
              <Button
                type="primary"

                icon={
                  <CodeOutlined />
                }

                onClick={() =>
                  setJsonModalOpen(
                    true,
                  )
                }
              >
                Paste Evaluation JSON
              </Button>


              <div
                style={{
                  display:
                    "inline-flex",

                  alignItems:
                    "center",

                  gap: 10,

                  padding:
                    "8px 14px",

                  borderRadius:
                    12,

                  background:
                    IS_TEST_MODE
                      ? "linear-gradient(90deg,#fff7e6,#fff1b8)"
                      : "linear-gradient(90deg,#e6f4ff,#bae0ff)",

                  border:
                    `1px solid ${
                      IS_TEST_MODE
                        ? "#ffd591"
                        : "#91caff"
                    }`,
                }}
              >
                <span
                  style={{
                    fontSize: 13,

                    fontWeight:
                      600,

                    color:
                      IS_TEST_MODE
                        ? "#d46b08"
                        : "#0958d9",
                  }}
                >
                  {IS_TEST_MODE
                    ? "TEST MODE"
                    : "LIVE MODE"}
                </span>


                <Switch
                  checked={
                    IS_TEST_MODE
                  }

                  onChange={
                    Set_IS_TEST_MODE
                  }
                />
              </div>
            </Space>
          </Col>
        </Row>


        <Divider />


        {/* ==================================================
            EMPTY STATE
        ================================================== */}

        {!customers.length && (
          <Alert
            type="info"

            showIcon

            style={{
              marginBottom: 20,
            }}

            message="No evaluation data loaded"

            description="Click Paste Evaluation JSON, paste the complete endpoint response and press Load Data."
          />
        )}


        {/* ==================================================
            TIER CARDS
        ================================================== */}

        <Row
          gutter={[16, 16]}

          style={{
            marginBottom: 24,
          }}
        >
          <Col
            xs={24}
            sm={12}
            md={4}
          >
            <Card
              hoverable

              onClick={() => {
                setSelectedTier(
                  "",
                );

                setSelectedStatus(
                  "",
                );

                setSelectedResult(
                  "",
                );
              }}

              style={{
                borderRadius: 14,

                cursor:
                  "pointer",

                background:
                  "linear-gradient(145deg,#e3f2fd,#ffffff)",

                border:
                  !selectedTier
                    ? "2px solid #1976d2"
                    : "1px solid #e0e0e0",

                boxShadow:
                  !selectedTier
                    ? "0 6px 18px rgba(25,118,210,0.5)"
                    : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <Statistic
                title={
                  <Text
                    style={{
                      color:
                        "#1976d2",

                      fontWeight:
                        600,
                    }}
                  >
                    Loyalty Customers
                  </Text>
                }

                value={
                  summary.totalCustomers
                }

                valueStyle={{
                  fontWeight:
                    700,

                  color:
                    "#0d47a1",
                }}

                prefix={
                  <TeamOutlined />
                }
              />
            </Card>
          </Col>


          {[
            "Platinum",
            "Gold",
            "Silver",
            "Blue",
            "Warning",
            "Rejected",
            "Removed",
            "Removed Done",
          ].map(
            (tier) => {
              const active =
                selectedTier ===
                tier;


              return (
                <Col
                  xs={24}
                  sm={12}
                  md={4}

                  key={tier}
                >
                  <Tooltip
                    title={`Filter by ${tier}`}
                  >
                    <Card
                      hoverable

                      onClick={() => {
                        setSelectedStatus(
                          "",
                        );

                        setSelectedResult(
                          "",
                        );

                        setSelectedTier(
                          active
                            ? ""
                            : tier,
                        );
                      }}

                      style={{
                        borderRadius:
                          14,

                        textAlign:
                          "center",

                        cursor:
                          "pointer",

                        border:
                          active
                            ? `2px solid ${tierColors[tier]}`
                            : "1px solid #e0e0e0",

                        background:
                          active
                            ? tierColorsFade[
                                tier
                              ]
                            : "#fff",

                        boxShadow:
                          active
                            ? `0 6px 18px ${tierColors[tier]}55`
                            : "0 2px 8px rgba(0,0,0,0.05)",
                      }}
                    >
                      <Statistic
                        title={
                          <Text
                            style={{
                              color:
                                tierColors[
                                  tier
                                ],

                              fontWeight:
                                600,
                            }}
                          >
                            {tier}
                          </Text>
                        }

                        value={
                          summary
                            ?.tierCounts
                            ?.[tier] ||
                          0
                        }

                        prefix={
                          tierIcons[
                            tier
                          ] ||
                          <UserOutlined />
                        }

                        valueStyle={{
                          color:
                            tierColors[
                              tier
                            ],

                          fontWeight:
                            700,
                        }}
                      />
                    </Card>
                  </Tooltip>
                </Col>
              );
            },
          )}
        </Row>


        <Divider />


        {/* ==================================================
            MONTH
        ================================================== */}

        <Row
          justify="center"

          style={{
            marginBottom: 16,
          }}
        >
          <Col>
            <Card
              style={{
                borderRadius: 16,

                border:
                  "1px solid #f0f0f0",

                boxShadow:
                  "0 6px 20px rgba(0,0,0,0.06)",

                background:
                  "linear-gradient(135deg,#ffffff,#fafafa)",
              }}
            >
              {uniqueMonths.length ? (
                <Space wrap>
                  {firstStages.map(
                    (month) => (
                      <Tag
                        key={month}

                        color="processing"

                        style={{
                          padding:
                            "6px 14px",

                          borderRadius:
                            20,

                          fontWeight:
                            500,
                        }}
                      >
                        {displayMonth(
                          month,
                        )}
                      </Tag>
                    ),
                  )}


                  {uniqueMonths.length >
                    1 && (
                    <span>
                      • • •
                    </span>
                  )}


                  {lastStages.map(
                    (month) => (
                      <Tag
                        key={`last-${month}`}

                        color="success"

                        style={{
                          padding:
                            "6px 14px",

                          borderRadius:
                            20,

                          fontWeight:
                            600,
                        }}
                      >
                        {displayMonth(
                          month,
                        )}{" "}
                        Latest
                      </Tag>
                    ),
                  )}
                </Space>
              ) : (
                <Text type="secondary">
                  No evaluation
                  period available
                </Text>
              )}
            </Card>
          </Col>
        </Row>


        <Divider />


        {/* ==================================================
            STATUS CARDS
        ================================================== */}

        <Row
          gutter={[16, 16]}

          style={{
            marginBottom: 12,
          }}
        >
          <Col
            xs={24}
            sm={12}
            md={6}
          >
            <Card
              hoverable

              onClick={() => {
                setSelectedTier(
                  "",
                );

                setSelectedStatus(
                  selectedStatus ===
                    "Initial Load"
                    ? ""
                    : "Initial Load",
                );
              }}

              style={{
                borderRadius: 14,

                cursor:
                  "pointer",

                background:
                  "linear-gradient(145deg,#e8f5e9,#fff)",

                border:
                  selectedStatus ===
                  "Initial Load"
                    ? "2px solid #2e7d32"
                    : "1px solid #c8e6c9",
              }}
            >
              <Statistic
                title="New Customers"

                value={
                  summary.new_customers
                }

                prefix={
                  <UserAddOutlined />
                }

                valueStyle={{
                  color:
                    "#1b5e20",
                }}
              />
            </Card>
          </Col>


          <Col
            xs={24}
            sm={12}
            md={6}
          >
            <Card
              hoverable

              onClick={() => {
                setSelectedTier(
                  "",
                );

                setSelectedStatus(
                  selectedStatus ===
                    "Upgraded"
                    ? ""
                    : "Upgraded",
                );
              }}

              style={{
                borderRadius: 14,

                cursor:
                  "pointer",

                background:
                  "linear-gradient(145deg,#e3f2fd,#fff)",

                border:
                  selectedStatus ===
                  "Upgraded"
                    ? "2px solid #1976d2"
                    : "1px solid #bbdefb",
              }}
            >
              <Statistic
                title="Upgrades"

                value={
                  summary.upgrades
                }

                prefix={
                  <ArrowUpOutlined />
                }

                valueStyle={{
                  color:
                    "#1976d2",
                }}
              />
            </Card>
          </Col>


          <Col
            xs={24}
            sm={12}
            md={6}
          >
            <Card
              hoverable

              onClick={() => {
                setSelectedTier(
                  "",
                );

                setSelectedStatus(
                  selectedStatus ===
                    "Same"
                    ? ""
                    : "Same",
                );
              }}

              style={{
                borderRadius: 14,

                cursor:
                  "pointer",

                background:
                  "linear-gradient(145deg,#fff3e0,#fff)",

                border:
                  selectedStatus ===
                  "Same"
                    ? "2px solid #f57c00"
                    : "1px solid #ffe0b2",
              }}
            >
              <Statistic
                title="Not Changed"

                value={
                  summary.same
                }

                prefix={
                  <MinusOutlined />
                }

                valueStyle={{
                  color:
                    "#f57c00",
                }}
              />
            </Card>
          </Col>


          <Col
            xs={24}
            sm={12}
            md={6}
          >
            <Card
              hoverable

              onClick={() => {
                setSelectedTier(
                  "",
                );

                setSelectedStatus(
                  selectedStatus ===
                    "Down"
                    ? ""
                    : "Down",
                );
              }}

              style={{
                borderRadius: 14,

                cursor:
                  "pointer",

                background:
                  "linear-gradient(145deg,#ffebee,#fff)",

                border:
                  selectedStatus ===
                  "Down"
                    ? "2px solid #d32f2f"
                    : "1px solid #ffcdd2",
              }}
            >
              <Statistic
                title="Downgrades"

                value={
                  summary.downgrades
                }

                prefix={
                  <ArrowDownOutlined />
                }

                valueStyle={{
                  color:
                    "#d32f2f",
                }}
              />
            </Card>
          </Col>
        </Row>


        <Divider />


        {/* ==================================================
            SEARCH
        ================================================== */}

        <Row
          justify="space-between"

          gutter={[12, 12]}

          style={{
            marginBottom: 20,
          }}
        >
          <Col
            xs={24}
            md={12}
          >
            <Input.Search
              placeholder="Search by name, email or mobile"

              allowClear

              value={
                searchText
              }

              onChange={(e) =>
                setSearchText(
                  e.target.value,
                )
              }
            />
          </Col>


          {selectedStatus && (
            <Col
              xs={24}
              md={6}
            >
              <Button
                block

                loading={
                  sendingMailAll
                }

                icon={
                  <MailOutlined />
                }

                type="primary"

                style={{
                  background:
                    "#7b2ff7",

                  borderColor:
                    "#7b2ff7",
                }}

                onClick={() =>
                  handleSendLoyaltyEmails(
                    selectedStatus,
                  )
                }
              >
                Send Emails to{" "}
                {selectedStatus}{" "}
                Customers
              </Button>
            </Col>
          )}
        </Row>


        {/* ==================================================
            TABLE
        ================================================== */}

        <Table
          columns={
            columns
          }

          dataSource={
            filtered
          }

          rowKey="key"

          bordered

          size="middle"

          scroll={{
            x: 1800,
            y: 420,
          }}

          pagination={{
            current:
              pagination.current,

            pageSize:
              pagination.pageSize,

            showSizeChanger:
              true,

            pageSizeOptions: [
              "5",
              "10",
              "25",
              "50",
              "100",
              "300",
            ],

            showTotal: (
              total,
              range,
            ) =>
              `Showing ${range[0]}-${range[1]} of ${total} customers`,

            onChange: (
              page,
              pageSize,
            ) =>
              setPagination({
                current:
                  page,

                pageSize,
              }),
          }}

          onRow={(record) => ({
            onClick: () => {
              setSelectedCustomer(
                record,
              );

              setDetailsOpen(
                true,
              );
            },
          })}

          rowClassName={(record) => {
            const tier =
              record.CustomerInfo
                ?.Current_Loyalty_Tier;


            if (
              tier ===
              "Platinum"
            ) {
              return "tier-row-platinum";
            }


            if (
              tier === "Gold"
            ) {
              return "tier-row-gold";
            }


            if (
              tier ===
              "Silver"
            ) {
              return "tier-row-silver";
            }


            if (
              tier === "Blue"
            ) {
              return "tier-row-blue";
            }


            return "";
          }}
        />


        {/* ==================================================
            BOTTOM BUTTONS
        ================================================== */}

        <div
          style={{
            textAlign:
              "center",

            marginTop: 25,
          }}
        >
          <Button
            icon={
              <ReloadOutlined />
            }

            onClick={() => {
              setSearchText(
                "",
              );

              setSelectedTier(
                "",
              );

              setSelectedStatus(
                "",
              );

              setSelectedResult(
                "",
              );

              setFiltered(
                customers,
              );
            }}
          >
            Reset Filters
          </Button>


          <Button
            icon={
              <DownloadOutlined />
            }

            type="primary"

            style={{
              marginLeft: 10,
            }}

            onClick={
              handleDownloadData
            }
          >
            Download Evaluation
          </Button>


          <Button
            type="primary"

            icon={
              <CodeOutlined />
            }

            style={{
              marginLeft: 10,

              background:
                "#7b2ff7",

              borderColor:
                "#7b2ff7",
            }}

            onClick={() =>
              setJsonModalOpen(
                true,
              )
            }
          >
            Paste New JSON
          </Button>


          <Popconfirm
            title="Clear evaluation data?"

            description="All currently loaded evaluation data will be removed from this page."

            okText="Clear"

            cancelText="Cancel"

            onConfirm={
              clearEvaluation
            }
          >
            <Button
              danger

              icon={
                <DeleteOutlined />
              }

              style={{
                marginLeft: 10,
              }}
            >
              Clear
            </Button>
          </Popconfirm>
        </div>
      </Spin>


      {/* ====================================================
          PASTE JSON MODAL
      ==================================================== */}

      <Modal
        title="Paste Loyalty Evaluation JSON"

        open={
          jsonModalOpen
        }

        width={850}

        centered

        okText="Load Data"

        cancelText="Cancel"

        onOk={
          handleLoadJson
        }

        onCancel={() =>
          setJsonModalOpen(
            false,
          )
        }
      >
        <Alert
          type="info"

          showIcon

          style={{
            marginBottom: 16,
          }}

          message="Paste the complete evaluation endpoint response"

          description='The JSON should contain a "members" array.'
        />


        <Input.TextArea
          rows={20}

          value={
            jsonText
          }

          onChange={(e) =>
            setJsonText(
              e.target.value,
            )
          }

          placeholder={`{
  "members": [
    {
      "mobile_number": "0701526879",
      "first_name": "Tharindu",
      "last_name": "Lakmal",
      "previous_level": "Blue",
      "new_level": "Warning",
      "total_ticket_count": 1530,
      "monthly_ticket_count": 0,
      "last_month": "0",
      "last_update": "2026_August",
      "evaluation_status": "WARNING",
      "reason": "Second evaluation below monthly requirement",
      "level_changed": true
    }
  ]
}`}

          style={{
            fontFamily:
              "monospace",

            fontSize: 13,
          }}
        />
      </Modal>


      {/* ====================================================
          CUSTOMER DETAIL MODAL
      ==================================================== */}

      <Modal
        title="Loyalty Evaluation Details"

        open={
          detailsOpen
        }

        width={750}

        footer={null}

        onCancel={() =>
          setDetailsOpen(
            false,
          )
        }
      >
        {selectedCustomer && (
          <>
            <Row
              gutter={[16, 16]}
            >
              <Col
                xs={24}
                md={12}
              >
                <Card size="small">
                  <Text type="secondary">
                    Customer
                  </Text>

                  <br />

                  <Text strong>
                    {selectedCustomer
                      .CustomerInfo
                      ?.FirstName}{" "}
                    {selectedCustomer
                      .CustomerInfo
                      ?.LastName}
                  </Text>
                </Card>
              </Col>


              <Col
                xs={24}
                md={12}
              >
                <Card size="small">
                  <Text type="secondary">
                    Mobile
                  </Text>

                  <br />

                  <Text strong>
                    {
                      selectedCustomer.MobileNumber
                    }
                  </Text>
                </Card>
              </Col>


              <Col
                xs={24}
                md={12}
              >
                <Card size="small">
                  <Text type="secondary">
                    Previous Level
                  </Text>

                  <br />

                  <Tag
                    color={
                      tierColors[
                        selectedCustomer
                          .CustomerInfo
                          ?.lastMonthLoyaltyTier
                      ]
                    }
                  >
                    {
                      selectedCustomer
                        .CustomerInfo
                        ?.lastMonthLoyaltyTier
                    }
                  </Tag>
                </Card>
              </Col>


              <Col
                xs={24}
                md={12}
              >
                <Card size="small">
                  <Text type="secondary">
                    New Level
                  </Text>

                  <br />

                  <Tag
                    color={
                      tierColors[
                        selectedCustomer
                          .CustomerInfo
                          ?.Current_Loyalty_Tier
                      ]
                    }
                  >
                    {
                      selectedCustomer
                        .CustomerInfo
                        ?.Current_Loyalty_Tier
                    }
                  </Tag>
                </Card>
              </Col>


              <Col
                xs={24}
                md={8}
              >
                <Card size="small">
                  <Statistic
                    title="Total Tickets"

                    value={
                      selectedCustomer
                        .CustomerInfo
                        ?.Current_Ticket_Count ||
                      0
                    }
                  />
                </Card>
              </Col>


              <Col
                xs={24}
                md={8}
              >
                <Card size="small">
                  <Statistic
                    title="This Month"

                    value={
                      selectedCustomer
                        .CustomerInfo
                        ?.Monthly_Ticket_Count ||
                      0
                    }
                  />
                </Card>
              </Col>


              <Col
                xs={24}
                md={8}
              >
                <Card size="small">
                  <Statistic
                    title="Last Month"

                    value={
                      selectedCustomer
                        .CustomerInfo
                        ?.Last_Month_Ticket_Count ||
                      0
                    }
                  />
                </Card>
              </Col>
            </Row>


            <Divider />


            <Title level={5}>
              Evaluation
            </Title>


            <p>
              <Text strong>
                Evaluation Result:
              </Text>{" "}
              {
                selectedCustomer
                  .CustomerInfo
                  ?.Evaluation_Result
              }
            </p>


            <p>
              <Text strong>
                Change Status:
              </Text>{" "}
              {
                selectedCustomer
                  .CustomerInfo
                  ?.Evaluation_Status
              }
            </p>


            <p>
              <Text strong>
                Level Changed:
              </Text>{" "}
              {selectedCustomer
                .CustomerInfo
                ?.Level_Changed
                ? "Yes"
                : "No"}
            </p>


            <p>
              <Text strong>
                Last Update:
              </Text>{" "}
              {displayMonth(
                selectedCustomer
                  .Last_Update,
              )}
            </p>


            <Divider />


            <Text strong>
              Reason
            </Text>


            <Alert
              style={{
                marginTop: 10,
              }}

              type="info"

              showIcon

              message={
                selectedCustomer
                  .CustomerInfo
                  ?.Evaluation_Reason ||
                "No reason provided"
              }
            />


            <Divider />


            <Title level={5}>
              Original JSON Object
            </Title>


            <pre
              style={{
                background:
                  "#f5f5f5",

                padding: 16,

                borderRadius: 8,

                maxHeight: 300,

                overflow:
                  "auto",

                fontSize: 12,
              }}
            >
              {JSON.stringify(
                selectedCustomer.EvaluationData,
                null,
                2,
              )}
            </pre>
          </>
        )}
      </Modal>


      {/* ====================================================
          EMAIL LOG MODAL
      ==================================================== */}

      <Modal
        open={
          logModalVisible
        }

        onCancel={() =>
          setLogModalVisible(
            false,
          )
        }

        width={650}

        centered

        maskClosable={
          false
        }

        footer={null}

        title="Sending Loyalty Emails"
      >
        <Progress
          percent={
            progress
          }

          strokeWidth={10}

          strokeColor={{
            "0%":
              "#7b2ff7",

            "100%":
              "#f107a3",
          }}

          trailColor="#f0f0f0"

          status="active"

          style={{
            marginBottom: 28,
          }}
        />


        <Row
          gutter={[16, 16]}

          style={{
            marginBottom: 25,
          }}
        >
          <Col span={8}>
            <Card>
              <Statistic
                title="Success"

                value={
                  successCount
                }

                valueStyle={{
                  color:
                    "#00bd00",
                }}

                prefix={
                  <CheckCircleOutlined />
                }
              />
            </Card>
          </Col>


          <Col span={8}>
            <Card>
              <Statistic
                title="Images Saved"

                value={
                  imageCount
                }

                prefix={
                  <PictureOutlined />
                }
              />
            </Card>
          </Col>


          <Col span={8}>
            <Card>
              <Statistic
                title="Failed"

                value={
                  failCount
                }

                valueStyle={{
                  color:
                    "#c90000",
                }}

                prefix={
                  <CloseCircleOutlined />
                }
              />
            </Card>
          </Col>
        </Row>


        <List
          size="small"

          bordered

          dataSource={
            logList
          }

          style={{
            maxHeight: 320,

            overflowY:
              "auto",
          }}

          renderItem={(item) => (
            <List.Item>
              <Space>
                {item.status ===
                  "sending" && (
                  <ClockCircleTwoTone
                    twoToneColor="#faad14"
                  />
                )}


                {item.status ===
                  "success" && (
                  <CheckCircleTwoTone
                    twoToneColor="#52c41a"
                  />
                )}


                {item.status ===
                  "failed" && (
                  <CloseCircleTwoTone
                    twoToneColor="#ff4d4f"
                  />
                )}


                <Text strong>
                  {item.name}
                </Text>


                <Text type="secondary">
                  {item.email ||
                    "No Email"}
                </Text>
              </Space>
            </List.Item>
          )}
        />


        <Divider />


        <div
          style={{
            textAlign:
              "center",
          }}
        >
          <Space>
            {pausedRef.current ? (
              <Button
                icon={
                  <PlayCircleOutlined />
                }

                onClick={
                  handleResume
                }
              >
                Resume
              </Button>
            ) : (
              <Button
                icon={
                  <PauseCircleOutlined />
                }

                onClick={
                  handlePause
                }
              >
                Pause
              </Button>
            )}


            <Button
              danger

              icon={
                <StopOutlined />
              }

              onClick={
                handleStop
              }
            >
              Stop & Close
            </Button>
          </Space>
        </div>
      </Modal>
    </>
  );
}

export default LoyaltyEvaluationCustomers;