
import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Form,
  Spinner,
  Alert
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

const CourtStats = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!isOwner) {
      navigate("/");
      return;
    }
    fetchCourtStats();
  }, [id, isOwner, navigate, dateRange]);

  const fetchCourtStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/courts/${id}/stats`, {
        params: dateRange
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching court stats:", error);
      if (error.response?.status === 403) {
        toast.error("Bạn không có quyền xem thống kê sân này");
        navigate("/dashboard");
      } else {
        toast.error("Lỗi tải thống kê sân");
      }
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" size="lg" />
        <p className="mt-3">Đang tải thống kê...</p>
      </Container>
    );
  }

  if (!stats) {
    return (
      <Container className="py-5">
        <Alert variant="danger">Không thể tải thống kê sân</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <i className="fas fa-chart-bar me-2"></i>
                Thống kê sân: {stats.court.name}
              </h2>
              <p className="text-muted">{stats.court.address}</p>
            </div>
            <Button variant="outline-secondary" onClick={() => navigate("/dashboard")}>
              <i className="fas fa-arrow-left me-1"></i>
              Quay lại Dashboard
            </Button>
          </div>
        </Col>
      </Row>

      {/* Date Range Filter */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h6>Chọn khoảng thời gian</h6>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Từ ngày</Form.Label>
                    <Form.Control
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({
                        ...prev,
                        startDate: e.target.value
                      }))}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Đến ngày</Form.Label>
                    <Form.Control
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({
                        ...prev,
                        endDate: e.target.value
                      }))}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Summary Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100 border-primary">
            <Card.Body>
              <i className="fas fa-calendar-check fa-2x text-primary mb-2"></i>
              <h4 className="text-primary">{stats.summary.totalBookings}</h4>
              <p className="text-muted mb-0">Tổng booking</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-success">
            <Card.Body>
              <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
              <h4 className="text-success">{stats.summary.confirmedBookings}</h4>
              <p className="text-muted mb-0">Đã xác nhận</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-warning">
            <Card.Body>
              <i className="fas fa-money-bill-wave fa-2x text-warning mb-2"></i>
              <h4 className="text-warning">
                {stats.summary.totalRevenue.toLocaleString("vi-VN")}đ
              </h4>
              <p className="text-muted mb-0">Tổng doanh thu</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-info">
            <Card.Body>
              <i className="fas fa-wallet fa-2x text-info mb-2"></i>
              <h4 className="text-info">
                {stats.summary.netRevenue.toLocaleString("vi-VN")}đ
              </h4>
              <p className="text-muted mb-0">Doanh thu thực nhận</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Doanh thu theo ngày</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? `${value.toLocaleString("vi-VN")}đ` : value,
                      name === 'revenue' ? 'Doanh thu' : 'Số booking'
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Doanh thu" />
                  <Line type="monotone" dataKey="bookings" stroke="#82ca9d" name="Số booking" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Khung giờ phổ biến</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.hourlyStats.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Customers & Recent Bookings */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Top khách hàng</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive striped className="mb-0">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Booking</th>
                    <th>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topCustomers.map((customer, index) => (
                    <tr key={customer._id}>
                      <td>
                        <strong>{customer.customer.name}</strong>
                        <br />
                        <small className="text-muted">{customer.customer.phone}</small>
                      </td>
                      <td>
                        <Badge bg="primary">{customer.bookings}</Badge>
                      </td>
                      <td className="text-success">
                        {customer.revenue.toLocaleString("vi-VN")}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Booking gần đây</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive striped className="mb-0">
                <thead>
                  <tr>
                    <th>Ngày & Giờ</th>
                    <th>Khách hàng</th>
                    <th>Giá</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentBookings.slice(0, 10).map((booking) => (
                    <tr key={booking._id}>
                      <td>
                        <small>
                          {new Date(booking.date).toLocaleDateString("vi-VN")}
                          <br />
                          {booking.startTime} - {booking.endTime}
                        </small>
                      </td>
                      <td>
                        <strong>{booking.player.name}</strong>
                        <br />
                        <small className="text-muted">{booking.player.phone}</small>
                      </td>
                      <td className="text-success">
                        {booking.totalPrice.toLocaleString("vi-VN")}đ
                      </td>
                      <td>
                        <Badge 
                          bg={booking.status === 'confirmed' ? 'success' : 
                              booking.status === 'pending' ? 'warning' : 'danger'}
                        >
                          {booking.status === 'confirmed' ? 'Đã xác nhận' :
                           booking.status === 'pending' ? 'Chờ xác nhận' : 'Đã hủy'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CourtStats;