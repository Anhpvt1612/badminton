import React, { useState, useEffect, useCallback } from "react";
import {
  Navbar as BootstrapNavbar,
  Nav,
  NavDropdown,
  Container,
  Modal,
  Form,
  Button,
  Alert,
  Badge,
} from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // THÊM: State cho notification chat
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleTopUp = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!amount || amount < 10000 || amount > 10000000) {
        setError("Số tiền phải từ 10,000 đến 10,000,000 VND");
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/api/payment/create_payment_url",
        { amount: parseInt(amount) }
      );

      window.location.href = response.data.paymentUrl;
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tạo URL thanh toán");
    } finally {
      setLoading(false);
    }
  };

  // THÊM useCallback để tránh warning dependency
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await axios.get("/api/chat/unread-count");
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [isAuthenticated]);

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await axios.get("/api/chat/conversations");
      setConversations(response.data?.slice(0, 5) || []); // Chỉ lấy 5 conversation gần nhất
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [isAuthenticated]);

  // SỬA useEffect với dependencies đúng
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      fetchConversations();

      // Polling mỗi 30 giây để cập nhật realtime
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchConversations();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnreadCount, fetchConversations]);

  // THÊM: Reset unread count khi vào trang chat
  useEffect(() => {
    if (location.pathname.startsWith("/chat") && unreadCount > 0) {
      setUnreadCount(0);
    }
  }, [location.pathname, unreadCount]);

  // THÊM: Navigate to specific chat
  const handleChatNavigation = (conversation) => {
    if (conversation.chatType === "direct") {
      navigate(`/chat?user=${conversation.otherUser._id}`);
    } else if (conversation.chatType === "group") {
      navigate(`/chat/group/${conversation._id}`);
    }
  };

  // THÊM: Get chat title - FUNCTION BỊ THIẾU
  const getChatTitle = (conversation) => {
    if (!conversation) return "Chat";

    if (conversation.chatType === "direct") {
      return conversation.otherUser?.name || "Người dùng";
    } else if (conversation.chatType === "group") {
      return conversation.groupInfo?.name || "Nhóm chat";
    }
    return "Chat";
  };

  // SỬA: Format last message preview - QUAN TRỌNG
  const formatLastMessage = (conversation) => {
    if (!conversation.lastMessage) return "Chưa có tin nhắn";

    // SỬA: Kiểm tra xem lastMessage có phải là object không
    let message = "";
    if (typeof conversation.lastMessage === "string") {
      message = conversation.lastMessage;
    } else if (conversation.lastMessage.message) {
      message = conversation.lastMessage.message;
    } else if (conversation.lastMessage.content) {
      message = conversation.lastMessage.content;
    } else {
      message = "Tin nhắn mới";
    }

    return message.length > 30 ? message.substring(0, 30) + "..." : message;
  };

  // SỬA: Format time cho last message
  const formatMessageTime = (conversation) => {
    if (!conversation.lastMessage) return "";

    try {
      let timestamp = null;
      if (conversation.lastMessage.createdAt) {
        timestamp = conversation.lastMessage.createdAt;
      } else if (conversation.lastMessage.timestamp) {
        timestamp = conversation.lastMessage.timestamp;
      } else if (conversation.updatedAt) {
        timestamp = conversation.updatedAt;
      }

      if (timestamp) {
        return new Date(timestamp).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (error) {
      console.error("Error formatting message time:", error);
    }

    return "";
  };

  return (
    <BootstrapNavbar bg="primary" variant="dark" expand="lg" sticky="top">
      <Container>
        <LinkContainer to="/">
          <BootstrapNavbar.Brand>
            <i className="fas fa-shuttlecock me-2"></i>
            BadmintonBooking
          </BootstrapNavbar.Brand>
        </LinkContainer>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Trang chủ</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/courts">
              <Nav.Link>Sân cầu lông</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/posts">
              <Nav.Link>Tìm đối thủ</Nav.Link>
            </LinkContainer>
          </Nav>

          <Nav>
            {isAuthenticated ? (
              <>
                <div className="d-flex align-items-center me-3">
                  <i className="fas fa-wallet me-1"></i>
                  <span style={{ color: "#fff", fontWeight: 500 }}>
                    Số dư: {user?.walletBalance?.toLocaleString("vi-VN") || 0}đ
                  </span>
                  <Button
                    variant="outline-light"
                    size="sm"
                    className="ms-2"
                    onClick={() => setShowModal(true)}
                  >
                    Nạp tiền
                  </Button>
                </div>

                {/* CHAT DROPDOWN VỚI NOTIFICATION - SỬA */}
                <NavDropdown
                  title={
                    <span className="position-relative">
                      <i className="fas fa-comments me-1"></i>
                      Chat
                      {unreadCount > 0 && (
                        <Badge
                          bg="danger"
                          pill
                          className="position-absolute top-0 start-100 translate-middle"
                          style={{ fontSize: "0.7rem" }}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </span>
                  }
                  id="chat-dropdown"
                  className="me-2"
                >
                  {conversations.length > 0 ? (
                    <>
                      {conversations.map((conversation) => (
                        <NavDropdown.Item
                          key={conversation._id}
                          onClick={() => handleChatNavigation(conversation)}
                          className="py-2"
                          style={{ maxWidth: "300px" }}
                        >
                          <div>
                            <div className="d-flex justify-content-between align-items-center">
                              <strong className="small text-truncate">
                                {getChatTitle(conversation)}
                              </strong>
                              {conversation.chatType === "group" && (
                                <Badge
                                  bg={
                                    conversation.groupInfo?.type ===
                                    "post_group"
                                      ? "primary"
                                      : "success"
                                  }
                                  className="ms-2"
                                  style={{ fontSize: "0.6rem" }}
                                >
                                  {conversation.groupInfo?.type === "post_group"
                                    ? "Nhóm"
                                    : "Đặt sân"}
                                </Badge>
                              )}
                            </div>

                            <div className="d-flex justify-content-between align-items-center mt-1">
                              <small className="text-muted text-truncate flex-grow-1">
                                {formatLastMessage(conversation)}
                              </small>
                              {formatMessageTime(conversation) && (
                                <small
                                  className="text-muted ms-2"
                                  style={{ fontSize: "0.65rem" }}
                                >
                                  {formatMessageTime(conversation)}
                                </small>
                              )}
                            </div>

                            {conversation.chatType === "group" &&
                              conversation.groupInfo?.participants && (
                                <small
                                  className="text-muted d-block"
                                  style={{ fontSize: "0.65rem" }}
                                >
                                  {conversation.groupInfo.participants.length}{" "}
                                  thành viên
                                </small>
                              )}
                          </div>
                        </NavDropdown.Item>
                      ))}
                      <NavDropdown.Divider />
                      <LinkContainer to="/chat">
                        <NavDropdown.Item className="text-center text-primary">
                          <i className="fas fa-eye me-1"></i>
                          Xem tất cả cuộc trò chuyện
                        </NavDropdown.Item>
                      </LinkContainer>
                    </>
                  ) : (
                    <>
                      <NavDropdown.Item disabled>
                        <small className="text-muted">
                          Chưa có cuộc trò chuyện nào
                        </small>
                      </NavDropdown.Item>
                      <NavDropdown.Divider />
                      <LinkContainer to="/chat">
                        <NavDropdown.Item className="text-center text-primary">
                          <i className="fas fa-comments me-1"></i>
                          Bắt đầu chat
                        </NavDropdown.Item>
                      </LinkContainer>
                    </>
                  )}
                </NavDropdown>

                <NavDropdown title={user?.name} id="user-dropdown">
                  <LinkContainer to="/profile">
                    <NavDropdown.Item>
                      <i className="fas fa-user me-2"></i>
                      Hồ sơ
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/my-bookings">
                    <NavDropdown.Item>
                      <i className="fas fa-calendar-alt me-2"></i>
                      Lịch đặt sân
                    </NavDropdown.Item>
                  </LinkContainer>
                  {/* THÊM: Lịch sử giao dịch cho tất cả user */}
                  <LinkContainer to="/transactions">
                    <NavDropdown.Item>
                      <i className="fas fa-history me-2"></i>
                      Lịch sử giao dịch
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/my-posts">
                    <NavDropdown.Item>
                      <i className="fas fa-list-alt me-2"></i>
                      Bài đăng của tôi
                    </NavDropdown.Item>
                  </LinkContainer>
                  {isOwner && (
                    <>
                      <NavDropdown.Divider />
                      <LinkContainer to="/my-courts">
                        <NavDropdown.Item>
                          <i className="fas fa-building me-2"></i>
                          Quản lý sân
                        </NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/dashboard">
                        <NavDropdown.Item>
                          <i className="fas fa-chart-line me-2"></i>
                          Dashboard
                        </NavDropdown.Item>
                      </LinkContainer>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <NavDropdown.Divider />
                      <LinkContainer to="/admin">
                        <NavDropdown.Item>
                          <i className="fas fa-cog me-2"></i>
                          Quản trị
                        </NavDropdown.Item>
                      </LinkContainer>
                    </>
                  )}
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Đăng xuất
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <LinkContainer to="/login">
                  <Nav.Link>
                    <i className="fas fa-sign-in-alt me-1"></i>
                    Đăng nhập
                  </Nav.Link>
                </LinkContainer>
                <LinkContainer to="/register">
                  <Nav.Link>
                    <i className="fas fa-user-plus me-1"></i>
                    Đăng ký
                  </Nav.Link>
                </LinkContainer>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>

        {/* Modal nạp tiền */}
        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-wallet me-2"></i>
              Nạp tiền vào ví
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group controlId="amount">
                <Form.Label>Số tiền (VND)</Form.Label>
                <Form.Control
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Nhập số tiền (10,000 - 10,000,000 VND)"
                  min="10000"
                  max="10000000"
                  step="1000"
                />
                <Form.Text className="text-muted">
                  Số tiền tối thiểu: 10,000đ - Tối đa: 10,000,000đ
                </Form.Text>
                {error && (
                  <Alert variant="danger" className="mt-2">
                    {error}
                  </Alert>
                )}
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              <i className="fas fa-times me-1"></i>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleTopUp} disabled={loading}>
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fas fa-credit-card me-1"></i>
                  Nạp tiền
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
