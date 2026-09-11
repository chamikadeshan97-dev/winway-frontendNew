import React, { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Button, Typography, Modal } from "antd";
import {
  CloudUploadOutlined,
  SettingOutlined,
  LogoutOutlined,
  HeartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  FileImageOutlined,
  UserSwitchOutlined,
  BarChartOutlined,
  ScissorOutlined,
  AppstoreOutlined,
  TrophyOutlined,
} from "@ant-design/icons";

import logo from "../assets/logo.png";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const DashboardLayout = ({ activeTab, onTabChange, children, onLogout }) => {
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("user");
  const [collapsed, setCollapsed] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedRole = localStorage.getItem("role");

    if (storedName) {
      setUserName(storedName.trim());
    }

    if (storedRole) {
      setUserRole(storedRole.trim().toLowerCase());
    }
  }, []);

  const isAdmin = userRole === "admin";
  const isLoyaltyManager = userRole === "loyalty_manager";
  const isDataAnalyzer = userRole === "data_analyzer";
  const isFinancialUser = userRole === "financial";

  const canViewAnalytics = isAdmin || isDataAnalyzer;
  const canViewLoyalty = isAdmin || isLoyaltyManager;
  const canViewMessages = isAdmin || isLoyaltyManager;
  const canViewSplit = isAdmin || isFinancialUser;
  const canViewSettings = isAdmin;

  const canViewSystemUsers =
    isAdmin && userName.toLowerCase().includes("chamika");

  const loyaltyMenu = [
    {
      key: "5-8",
      label: "Loyalty Evaluation",
    },
     {
      key: "5-3",
      label: "Monthly Upgrade Process",
    },
    {
      key: "5-2",
      label: "Loyalty Customers",
    },
  ];

  const messageMenu = [
    {
      key: "6-1",
      label: "SMS",
    },
    {
      key: "6-2",
      label: "Emails",
    },
  ];

  const reportsMenu = [
    {
      key: "9-1",
      label: "Registrations",
    },
    {
      key: "9-4",
      label: "Summary",
    },
    {
      key: "9-5",
      label: "Reconciliation Summary",
    },
  ];

  const inventoryMenu = [
    {
      key: "10-2-1",
      label: "Order Entry",
    },
    {
      key: "10-2-2",
      label: "Assignment",
    },
    {
      key: "10-2-3",
      label: "Upload",
    },
    {
      key: "10-2-4",
      label: "Split",
    },
    {
      key: "10-2-5",
      label: "Download",
    },
  ];

  const resultMenuItems = [
    {
      key: "10-3-1",
      label: "Upload",
    },
    {
      key: "10-3-2",
      label: "Split",
    },
    {
      key: "10-3-3",
      label: "Download",
    },
  ];

  const menuItems = useMemo(() => {
    const sections = [];

    // Dashboard is visible to every logged-in user.

    if (canViewLoyalty) {
      sections.push([
        {
          key: "0",
          icon: <BarChartOutlined />,
          label: "Dashboard",
        },
      ]);
    }

    // Analytics section.
    if (canViewAnalytics) {
      sections.push([
        {
          key: "1",
          icon: <CloudUploadOutlined />,
          label: "Weekly Summary",
        },
        {
          key: "8",
          icon: <FileImageOutlined />,
          label: "Images",
        },
        {
          key: "9",
          icon: <FileImageOutlined />,
          label: "Reports",
          children: reportsMenu,
        },
      ]);
    }

    // Loyalty section.
    if (canViewLoyalty || canViewMessages) {
      const loyaltySection = [];

      if (canViewLoyalty) {
        loyaltySection.push({
          key: "5",
          icon: <HeartOutlined />,
          label: "Loyalty",
          children: loyaltyMenu,
        });
      }

      if (canViewMessages) {
        loyaltySection.push({
          key: "6",
          icon: <MessageOutlined />,
          label: "Custom Messages",
          children: messageMenu,
        });
      }

      sections.push(loyaltySection);
    }

    // Financial inventory and result processing section.
    if (canViewSplit) {
      sections.push([
        {
          key: "10-1",
          icon: <ScissorOutlined />,
          label: "Overview",
        },
        {
          key: "10-2",
          icon: <AppstoreOutlined />,
          label: "Inventory",
          children: inventoryMenu,
        },
        {
          key: "10-3",
          icon: <TrophyOutlined />,
          label: "Results",
          children: resultMenuItems,
        },
      ]);
    }

    // Administration section.
    if (canViewSettings || canViewSystemUsers) {
      const adminSection = [];

      if (canViewSettings) {
        adminSection.push({
          key: "4",
          icon: <SettingOutlined />,
          label: "Settings",
        });
      }

      if (canViewSystemUsers) {
        adminSection.push({
          key: "11",
          icon: <UserSwitchOutlined />,
          label: "System Users",
        });
      }

      sections.push(adminSection);
    }

    // Add dividers only between sections that contain menu items.
    return sections
      .filter((section) => section.length > 0)
      .flatMap((section, index) => {
        if (index === 0) {
          return section;
        }

        return [
          {
            type: "divider",
            key: `divider-${index}`,
          },
          ...section,
        ];
      });
  }, [
    canViewAnalytics,
    canViewLoyalty,
    canViewMessages,
    canViewSplit,
    canViewSettings,
    canViewSystemUsers,
  ]);

  const getRoleLabel = () => {
    switch (userRole) {
      case "admin":
        return "Admin";

      case "loyalty_manager":
        return "Loyalty Manager";

      case "data_analyzer":
        return "Data Analyzer";

      case "financial":
        return "Financial User";

      default:
        return "User";
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case "0":
        return "Dashboard";

      case "1":
        return "Weekly Summary";

      case "2":
        return "Results & Rankings";

      case "4":
        return "Settings";

      case "5":
        return "Loyalty";

      case "5-1":
        return "Entry Process";

      case "5-2":
        return "Loyalty Customers";

      case "5-3":
        return "Monthly Upgrade Process";

      case "6":
        return "Custom Messages";

      case "6-1":
        return "SMS";

      case "6-2":
        return "Emails";

      case "8":
        return "Images";

      case "9":
        return "Reports";

      case "9-1":
        return "Registrations";

      case "9-4":
        return "Summary";

      case "9-5":
        return "Reconciliation Summary";

      case "10-1":
        return "Inventory Overview";

      case "10-2":
        return "Inventory";

      case "10-2-1":
        return "Order Entry";

      case "10-2-2":
        return "Agent Assignment";

      case "10-2-3":
        return "Upload DBF Archive";

      case "10-2-4":
        return "Split DBF Files";

      case "10-2-5":
        return "Download Split Files";

      case "10-3":
        return "Results";

      case "10-3-1":
        return "Result Upload";

      case "/result-split":
        return "Result Split";

      case "/result-download":
        return "Result Download";

      case "11":
        return "System Users";

      default:
        return "WinWay";
    }
  };

  return (
    <>
      <Layout
        style={{
          minHeight: "100vh",
          background: "linear-gradient(145deg, #f9f6ff, #fff4f9)",
        }}
      >
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={280}
          theme="dark"
          trigger={null}
          style={{
            background: "#001529",
            transition: "all 0.3s ease",
            boxShadow: "4px 0 25px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: collapsed ? "16px 0" : "26px 0",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
              transition: "all 0.3s ease",
            }}
          >
            <img
              src={logo}
              alt="WinWay"
              style={{
                width: collapsed ? 50 : 100,
                height: collapsed ? 50 : 100,
                objectFit: "contain",
                transition: "all 0.3s ease",
              }}
            />

            {!collapsed && (
              <>
                <Title
                  level={4}
                  style={{
                    color: "#fff",
                    marginTop: 10,
                    marginBottom: 0,
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  }}
                >
                  WinWay
                </Title>

                <Text
                  style={{
                    color: "#ccc",
                    fontSize: 12,
                  }}
                >
                  Smart Insights
                </Text>
              </>
            )}
          </div>

          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={({ key }) => onTabChange(key)}
            items={menuItems}
            theme="dark"
            style={{
              marginTop: 12,
              paddingBottom: 20,
              background: "transparent",
              fontWeight: 500,
            }}
          />
        </Sider>

        <Layout>
          <Header
            style={{
              height: 70,
              padding: "0 30px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#001529",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <Button
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((previous) => !previous)}
                style={{
                  border: "none",
                  color: "#fff",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 8,
                }}
              />

              <Title
                level={4}
                style={{
                  color: "#fff",
                  margin: 0,
                  textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
              >
                {getPageTitle()}
              </Title>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                color: "#fff",
              }}
            >
              <div
                style={{
                  textAlign: "right",
                  lineHeight: 1.25,
                }}
              >
                <Text
                  style={{
                    display: "block",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  Hi, {userName.split(" ")[0]}
                </Text>

                <Text
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 12,
                  }}
                >
                  {getRoleLabel()}
                </Text>
              </div>

              <Button
                icon={<LogoutOutlined />}
                onClick={() => setLogoutModalOpen(true)}
                style={{
                  border: "none",
                  color: "#fff",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 8,
                }}
              >
                Logout
              </Button>
            </div>
          </Header>

          <Content
            style={{
              padding: 40,
              overflowY: "auto",
              minHeight: "calc(100vh - 70px)",
            }}
          >
            <div
              style={{
                maxWidth: 1400,
                margin: "0 auto",
                background: "rgba(255,255,255,0.9)",
                borderRadius: 20,
                padding: 35,
                boxShadow:
                  "0 8px 30px rgba(123,47,247,0.15), 0 2px 10px rgba(241,7,163,0.08)",
                backdropFilter: "blur(6px)",
                transition: "all 0.3s ease",
              }}
            >
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>

      <Modal
        open={logoutModalOpen}
        onCancel={() => setLogoutModalOpen(false)}
        footer={null}
        centered
        width={460}
        styles={{
          body: {
            padding: 32,
          },
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(255,77,79,0.15), rgba(255,120,117,0.25))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 10px 30px rgba(255,77,79,0.15)",
            }}
          >
            <LogoutOutlined
              style={{
                fontSize: 38,
                color: "#ff4d4f",
              }}
            />
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: "#1f1f1f",
            }}
          >
            Confirm Logout
          </h2>

          <div
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "4px 12px",
              borderRadius: 20,
              background: "#fff7e6",
              color: "#d48806",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Session Active
          </div>

          <p
            style={{
              marginTop: 20,
              marginBottom: 30,
              color: "#8c8c8c",
              lineHeight: 1.7,
              fontSize: 15,
            }}
          >
            Are you sure you want to sign out from your WinWay account?
            <br />
            Unsaved changes and ongoing actions may be lost.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            <Button
              size="large"
              block
              onClick={() => setLogoutModalOpen(false)}
              style={{
                height: 46,
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              Stay Logged In
            </Button>

            <Button
              danger
              type="primary"
              block
              size="large"
              icon={<LogoutOutlined />}
              onClick={() => {
                setLogoutModalOpen(false);
                onLogout();
              }}
              style={{
                height: 46,
                borderRadius: 10,
                fontWeight: 600,
                boxShadow: "0 8px 20px rgba(255,77,79,0.5)",
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </Modal>

      <style>
        {`
          .ant-menu-dark .ant-menu-item-divider {
            margin: 12px 16px;
            border-color: rgba(255, 255, 255, 0.18);
          }

          .ant-menu-dark .ant-menu-item,
          .ant-menu-dark .ant-menu-submenu-title {
            margin-inline: 10px;
            width: calc(100% - 20px);
            border-radius: 8px;
          }

          .ant-menu-dark .ant-menu-item-selected {
            background: linear-gradient(
              135deg,
              rgba(22, 119, 255, 0.95),
              rgba(114, 46, 209, 0.9)
            ) !important;
          }
        `}
      </style>
    </>
  );
};

export default DashboardLayout;
