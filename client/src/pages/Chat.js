import React, { useState, useEffect } from "react";
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
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useAuth();
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const userIdFromQuery = searchParams.get("user");

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (groupId) {
      // Auto-select group chat
      setSelectedChat({
        chatType: "group",
        _id: groupId,
      });
      fetchGroupMessages(groupId);
    } else if (userIdFromQuery) {
      // Auto-select direct chat with specific user
      findAndSelectDirectChat(userIdFromQuery);
    }
  }, [groupId, userIdFromQuery, conversations]); // THÊM conversations dependency

  const fetchConversations = async () => {
    try {
      const response = await axios.get("/api/chat/conversations");
      setConversations(response.data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const findAndSelectDirectChat = async (otherUserId) => {
    try {
      // Tìm conversation với user này
      const conversation = conversations.find(
        (conv) =>
          conv.chatType === "direct" && conv.otherUser._id === otherUserId
      );

      if (conversation) {
        setSelectedChat(conversation);
        fetchDirectMessages(otherUserId);
      } else {
        // Tạo conversation mới nếu chưa có
        const response = await axios.get(`/api/users/${otherUserId}`);
        const newConversation = {
          chatType: "direct",
          otherUser: response.data,
          _id: otherUserId,
        };
        setSelectedChat(newConversation);
        setMessages([]); // Chưa có tin nhắn
      }
    } catch (error) {
      console.error("Error finding direct chat:", error);
    }
  };

  const fetchDirectMessages = async (otherUserId) => {
    try {
      const response = await axios.get(`/api/chat/messages/${otherUserId}`);
      setMessages(response.data || []);

      // Đánh dấu đã đọc
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

      // Đánh dấu đã đọc
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
      fetchConversations(); // Cập nhật danh sách conversations
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
      fetchConversations(); // Cập nhật danh sách conversations
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
      return `${selectedChat.otherUser.name}`;
    } else if (selectedChat.chatType === "group") {
      return selectedChat.groupInfo?.name || "Nhóm chat";
    }
  };

  const getChatSubtitle = () => {
    if (!selectedChat || selectedChat.chatType !== "group") return null;

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

  return (
    <Container fluid className="py-3">
      <Row style={{ height: "85vh" }}>
        <Col md={4}>
          <Card style={{ height: "100%" }}>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-comments me-2"></i>
                Cuộc trò chuyện
              </h5>
            </Card.Header>
            <Card.Body className="p-0" style={{ overflowY: "auto" }}>
              <ListGroup variant="flush">
                {conversations.length === 0 ? (
                  <ListGroup.Item className="text-center text-muted">
                    <i className="fas fa-inbox me-2"></i>
                    Chưa có cuộc trò chuyện nào
                  </ListGroup.Item>
                ) : (
                  conversations.map((conversation) => (
                    <ListGroup.Item
                      key={conversation._id}
                      action
                      onClick={() => handleSelectChat(conversation)}
                      active={selectedChat?._id === conversation._id}
                      className="py-3"
                    >
                      <div className="d-flex w-100 justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          {conversation.chatType === "direct" ? (
                            <>
                              <div className="d-flex align-items-center mb-1">
                                <h6 className="mb-0">{conversation.otherUser.name}</h6>
                              </div>
                              <small className="text-muted">
                                {getConversationPreview(conversation)}
                              </small>
                            </>
                          ) : (
                            <>
                              <div className="d-flex align-items-center mb-1">
                                <h6 className="mb-0 me-2">
                                  {conversation.groupInfo?.name}
                                </h6>
                                <Badge
                                  bg={
                                    conversation.groupInfo?.type === "post_group"
                                      ? "primary"
                                      : "success"
                                  }
                                  className="small"
                                >
                                  {conversation.groupInfo?.type === "post_group"
                                    ? "Nhóm"
                                    : "Đặt sân"}
                                </Badge>
                              </div>
                              <small className="text-muted d-block">
                                {conversation.groupInfo?.participants?.length} thành viên
                              </small>
                              <small className="text-muted">
                                {getConversationPreview(conversation)}
                              </small>
                            </>
                          )}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Card style={{ height: "100%" }}>
            <Card.Header>
              <div>
                <h5 className="mb-0">{getChatTitle()}</h5>
                {getChatSubtitle() && (
                  <small className="text-muted">{getChatSubtitle()}</small>
                )}
              </div>
            </Card.Header>
            <Card.Body
              className="d-flex flex-column"
              style={{ height: "calc(100% - 60px)" }}
            >
              <div className="flex-grow-1 mb-3" style={{ overflowY: "auto" }}>
                {selectedChat ? (
                  messages.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <i className="fas fa-comments fa-3x mb-3 text-muted"></i>
                      <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={`mb-3 ${
                          message.sender._id === user._id
                            ? "text-end"
                            : "text-start"
                        }`}
                      >
                        {selectedChat?.chatType === "group" &&
                          message.sender._id !== user._id && (
                            <small className="text-muted d-block">
                              <strong>{message.sender.name}</strong>
                            </small>
                          )}
                        <div
                          className={`d-inline-block p-3 rounded ${
                            message.sender._id === user._id
                              ? "bg-primary text-white"
                              : "bg-light"
                          }`}
                          style={{ maxWidth: "70%" }}
                        >
                          {message.message}
                        </div>
                        <small className="text-muted d-block mt-1">
                          {new Date(message.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-center text-muted py-5">
                    <i className="fas fa-comment-dots fa-3x mb-3 text-muted"></i>
                    <p>Chọn một cuộc trò chuyện để bắt đầu chat</p>
                  </div>
                )}
              </div>

              {selectedChat && (
                <Form
                  onSubmit={
                    selectedChat.chatType === "direct"
                      ? sendDirectMessage
                      : sendGroupMessage
                  }
                >
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      disabled={!selectedChat}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!selectedChat || !newMessage.trim()}
                    >
                      <i className="fas fa-paper-plane"></i>
                    </Button>
                  </InputGroup>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Chat;
