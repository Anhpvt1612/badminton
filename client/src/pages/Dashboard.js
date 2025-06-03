import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Container className="py-5">
      <h2 className="mb-4">Dashboard - Xin chào {user?.name}</h2>

      <Row>
        <Col md={4} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <Card.Title>Đặt sân</Card.Title>
              <Card.Text>Tìm và đặt sân cầu lông</Card.Text>
              <Button variant="primary" onClick={() => navigate("/courts")}>
                Xem sân
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <Card.Title>Booking của tôi</Card.Title>
              <Card.Text>Xem lịch đặt sân</Card.Text>
              <Button
                variant="success"
                onClick={() => navigate("/my-bookings")}
              >
                Xem booking
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <Card.Title>Cộng đồng</Card.Title>
              <Card.Text>Tham gia thảo luận</Card.Text>
              <Button variant="info" onClick={() => navigate("/posts")}>
                Xem bài viết
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
