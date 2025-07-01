import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Form,
  Button,
  InputGroup,
  Badge,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./Chat.css";

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const userIdFromQuery = searchParams.get("user");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (groupId) {
      setSelectedChat({
        chatType: "group",
        _id: groupId,
      });
      fetchGroupMessages(groupId);
    } else if (userIdFromQuery) {
      findAndSelectDirectChat(userIdFromQuery);
    }
  }, [groupId, userIdFromQuery, conversations]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/chat/conversations");
      setConversations(response.data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const findAndSelectDirectChat = async (otherUserId) => {
    try {
      const conversation = conversations.find(
        (conv) =>
          conv.chatType === "direct" && conv.otherUser._id === otherUserId
      );

      if (conversation) {
        setSelectedChat(conversation);
        fetchDirectMessages(otherUserId);
      } else {
        const response = await axios.get(`/api/users/${otherUserId}`);
        const newConversation = {
          chatType: "direct",
          otherUser: response.data,
          _id: otherUserId,
        };
        setSelectedChat(newConversation);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error finding direct chat:", error);
    }
  };

  const fetchDirectMessages = async (otherUserId) => {
    try {
      const response = await axios.get(`/api/chat/messages/${otherUserId}`);
      setMessages(response.data || []);

      await axios.post(`/api/chat/mark-all-read/${otherUserId}`, {
        chatType: "direct",
      });
    } catch (error) {
      console.error("Error fetching direct messages:", error);
    }
  };

  const fetchGroupMessages = async (groupId) => {
    try {
      const response = await axios.get(`/api/chat/group/${groupId}/messages`);
      setMessages(response.data || []);

      await axios.post(`/api/chat/mark-all-read/${groupId}`, {
        chatType: "group",
      });
    } catch (error) {
      console.error("Error fetching group messages:", error);
    }
  };

  const sendDirectMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await axios.post("/api/chat/send", {
        receiverId: selectedChat.otherUser._id,
        message: newMessage,
      });

      setNewMessage("");
      fetchDirectMessages(selectedChat.otherUser._id);
      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const sendGroupMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await axios.post(`/api/chat/group/${selectedChat._id}/send`, {
        message: newMessage,
      });

      setNewMessage("");
      fetchGroupMessages(selectedChat._id);
      fetchConversations();
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  };

  const handleSelectChat = async (conversation) => {
    setSelectedChat(conversation);

    if (conversation.chatType === "direct") {
      fetchDirectMessages(conversation.otherUser._id);
    } else if (conversation.chatType === "group") {
      fetchGroupMessages(conversation._id);
    }
  };

  const getChatTitle = () => {
    if (!selectedChat) return "Chọn cuộc trò chuyện";

    if (selectedChat.chatType === "direct") {
      return selectedChat.otherUser.name;
    } else if (selectedChat.chatType === "group") {
      return selectedChat.groupInfo?.name || "Nhóm chat";
    }
  };

  const getChatSubtitle = () => {
    if (!selectedChat || selectedChat.chatType !== "group") {
      if (selectedChat?.chatType === "direct") {
        return "Đang hoạt động";
      }
      return null;
    }

    const group = selectedChat.groupInfo;
    if (group?.type === "post_group") {
      return `Nhóm từ bài đăng: ${group.relatedPost?.title}`;
    } else if (group?.type === "booking_chat") {
      return "Chat đặt sân";
    }
    return null;
  };

  const getConversationPreview = (conversation) => {
    if (conversation.chatType === "direct") {
      return conversation.lastMessage?.message || "Chưa có tin nhắn";
    } else {
      return conversation.lastMessage?.message || "Chưa có tin nhắn";
    }
  };

  const getMessageTime = (createdAt) => {
    const messageDate = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    } else {
      return messageDate.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchTerm) return true;

    if (conversation.chatType === "direct") {
      return conversation.otherUser.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    } else {
      return conversation.groupInfo?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    }
  });

  const getUserInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="chat-page">
      <Container fluid className="chat-container">
        <Row className="h-100">
          {/* Sidebar */}
          <Col lg={4} md={5} className="chat-sidebar">
            <Card className="sidebar-card h-100">
              <Card.Header className="sidebar-header">
                <div className="header-content">
                  <h5 className="sidebar-title">
                    <i className="fas fa-comments me-2"></i>
                    Tin nhắn
                  </h5>
                  <Button className="action-btn">
                    <i className="fas fa-edit"></i>
                  </Button>
                </div>
                <div className="search-container">
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm cuộc trò chuyện..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </Card.Header>
              <Card.Body className="sidebar-body">
                {loading ? (
                  <div className="loading-state">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2">Đang tải...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>
                      {searchTerm
                        ? "Không tìm thấy cuộc trò chuyện nào"
                        : "Chưa có cuộc trò chuyện nào"}
                    </p>
                  </div>
                ) : (
                  <ListGroup className="conversations-list" variant="flush">
                    {filteredConversations.map((conversation) => (
                      <ListGroup.Item
                        key={conversation._id}
                        className={`conversation-item ${
                          selectedChat?._id === conversation._id ? "active" : ""
                        }`}
                        onClick={() => handleSelectChat(conversation)}
                      >
                        <div className="conversation-content">
                          <div className="conversation-avatar">
                            {conversation.chatType === "direct" ? (
                              <div className="user-avatar">
                                {conversation.otherUser.avatar ? (
                                  <img
                                    src={conversation.otherUser.avatar}
                                    alt="Avatar"
                                    className="avatar-img"
                                  />
                                ) : (
                                  <span>
                                    {getUserInitials(
                                      conversation.otherUser.name
                                    )}
                                  </span>
                                )}
                                <div className="online-indicator"></div>
                              </div>
                            ) : (
                              <div className="group-avatar">
                                <i className="fas fa-users"></i>
                              </div>
                            )}
                          </div>
                          <div className="conversation-details">
                            <div className="conversation-header">
                              <h6 className="conversation-name">
                                {conversation.chatType === "direct"
                                  ? conversation.otherUser.name
                                  : conversation.groupInfo?.name}
                              </h6>
                              <span className="conversation-time">
                                {conversation.lastMessage?.createdAt &&
                                  getMessageTime(
                                    conversation.lastMessage.createdAt
                                  )}
                              </span>
                            </div>
                            <div className="conversation-preview">
                              <p className="preview-text">
                                {getConversationPreview(conversation)}
                              </p>
                              {conversation.chatType === "group" && (
                                <Badge
                                  bg={
                                    conversation.groupInfo?.type ===
                                    "post_group"
                                      ? "primary"
                                      : "success"
                                  }
                                  className="chat-type-badge"
                                >
                                  {conversation.groupInfo?.type === "post_group"
                                    ? "Nhóm"
                                    : "Đặt sân"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Main Chat Area */}
          <Col lg={8} md={7} className="chat-main">
            <Card className="chat-card h-100">
              {selectedChat ? (
                <>
                  <Card.Header className="chat-header">
                    <div className="chat-info">
                      <div className="chat-avatar">
                        {selectedChat.chatType === "direct" ? (
                          <div className="user-avatar">
                            {selectedChat.otherUser.avatar ? (
                              <img
                                src={selectedChat.otherUser.avatar}
                                alt="Avatar"
                                className="avatar-img"
                              />
                            ) : (
                              <span>
                                {getUserInitials(selectedChat.otherUser.name)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="group-avatar">
                            <i className="fas fa-users"></i>
                          </div>
                        )}
                      </div>
                      <div className="chat-details">
                        <h5 className="chat-title">{getChatTitle()}</h5>
                        {getChatSubtitle() && (
                          <p className="chat-subtitle">{getChatSubtitle()}</p>
                        )}
                      </div>
                    </div>
                    <div className="chat-actions">
                      <Button className="action-btn">
                        <i className="fas fa-phone"></i>
                      </Button>
                      <Button className="action-btn">
                        <i className="fas fa-video"></i>
                      </Button>
                      <Button className="action-btn">
                        <i className="fas fa-info-circle"></i>
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body className="chat-body">
                    <div className="messages-container">
                      {messages.length === 0 ? (
                        <div className="no-messages">
                          <i className="fas fa-comments"></i>
                          <h6>Chưa có tin nhắn nào</h6>
                          <p>Hãy bắt đầu cuộc trò chuyện!</p>
                        </div>
                      ) : (
                        <div className="messages-list">
                          {messages.map((message, index) => {
                            const isMyMessage = message.sender._id === user._id;
                            const showAvatar =
                              selectedChat.chatType === "group" &&
                              !isMyMessage &&
                              (index === 0 ||
                                messages[index - 1].sender._id !==
                                  message.sender._id);

                            return (
                              <div
                                key={message._id}
                                className={`message-wrapper ${
                                  isMyMessage ? "my-message" : "other-message"
                                }`}
                              >
                                {showAvatar && (
                                  <div className="message-avatar">
                                    <div className="user-avatar">
                                      {message.sender.avatar ? (
                                        <img
                                          src={message.sender.avatar}
                                          alt="Avatar"
                                          className="avatar-img"
                                        />
                                      ) : (
                                        <span>
                                          {getUserInitials(message.sender.name)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <div className="message-content">
                                  {selectedChat.chatType === "group" &&
                                    !isMyMessage &&
                                    showAvatar && (
                                      <div className="message-sender">
                                        {message.sender.name}
                                      </div>
                                    )}
                                  <div
                                    className={`message-bubble ${
                                      isMyMessage ? "my-bubble" : "other-bubble"
                                    }`}
                                  >
                                    <p className="message-text">
                                      {message.message}
                                    </p>
                                    <span className="message-time">
                                      {getMessageTime(message.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                    <div className="chat-footer">
                      <Form
                        className="message-form"
                        onSubmit={
                          selectedChat.chatType === "direct"
                            ? sendDirectMessage
                            : sendGroupMessage
                        }
                      >
                        <InputGroup className="message-input-group">
                          <Button className="emoji-btn">
                            <i className="fas fa-smile"></i>
                          </Button>
                          <Button className="attach-btn">
                            <i className="fas fa-paperclip"></i>
                          </Button>
                          <Form.Control
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            className="message-input"
                          />
                          <Button
                            type="submit"
                            className="send-btn"
                            disabled={!newMessage.trim()}
                          >
                            <i className="fas fa-paper-plane"></i>
                          </Button>
                        </InputGroup>
                      </Form>
                    </div>
                  </Card.Body>
                </>
              ) : (
                <Card.Body className="d-flex align-items-center justify-content-center">
                  <div className="no-chat-selected">
                    <i className="fas fa-comment-dots"></i>
                    <h4>Chào mừng đến với Chat</h4>
                    <p>Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
                  </div>
                </Card.Body>
              )}
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Chat;
