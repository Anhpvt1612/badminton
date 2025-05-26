
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Form, Button, InputGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/chat/conversations');
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const response = await axios.get(`/api/chat/messages/${otherUserId}`);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await axios.post('/api/chat/send', {
        receiverId: selectedUser._id,
        message: newMessage
      });
      
      setNewMessage('');
      fetchMessages(selectedUser._id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSelectUser = (conversation) => {
    setSelectedUser(conversation.otherUser);
    fetchMessages(conversation.otherUser._id);
  };

  return (
    <Container fluid className="py-3">
      <Row style={{ height: '80vh' }}>
        <Col md={4}>
          <Card style={{ height: '100%' }}>
            <Card.Header>
              <h5>Cuộc trò chuyện</h5>
            </Card.Header>
            <Card.Body className="p-0" style={{ overflowY: 'auto' }}>
              <ListGroup variant="flush">
                {conversations.map(conversation => (
                  <ListGroup.Item 
                    key={conversation.otherUser._id}
                    action
                    onClick={() => handleSelectUser(conversation)}
                    active={selectedUser?._id === conversation.otherUser._id}
                  >
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">{conversation.otherUser.name}</h6>
                    </div>
                    <small>{conversation.lastMessage?.message}</small>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card style={{ height: '100%' }}>
            <Card.Header>
              <h5>{selectedUser ? `Chat với ${selectedUser.name}` : 'Chọn cuộc trò chuyện'}</h5>
            </Card.Header>
            <Card.Body className="d-flex flex-column" style={{ height: 'calc(100% - 60px)' }}>
              <div className="flex-grow-1 mb-3" style={{ overflowY: 'auto' }}>
                {messages.map(message => (
                  <div 
                    key={message._id} 
                    className={`mb-2 ${message.sender._id === user._id ? 'text-end' : 'text-start'}`}
                  >
                    <div 
                      className={`d-inline-block p-2 rounded ${
                        message.sender._id === user._id 
                          ? 'bg-primary text-white' 
                          : 'bg-light'
                      }`}
                      style={{ maxWidth: '70%' }}
                    >
                      {message.message}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedUser && (
                <Form onSubmit={sendMessage}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                    />
                    <Button type="submit" variant="primary">
                      Gửi
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
