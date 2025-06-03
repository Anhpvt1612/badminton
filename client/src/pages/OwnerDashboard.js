import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Tab,
  Tabs,
  Alert,
  Modal,
  Form,
  Spinner,
  ProgressBar,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
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
  Cell,
} from "recharts";

const OwnerDashboard = () => {
  const { user, updateUser, isOwner } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourts: 0,
    totalBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: [],
    bookingsByStatus: [],
    courtsByStatus: [],
    recentBookings: [],
  });

  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showPostingModal, setShowPostingModal] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [postingDays, setPostingDays] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionStats, setTransactionStats] = useState({});

  useEffect(() => {
    if (!isOwner) {
      navigate("/");
      return;
    }
    fetchDashboardData();
    fetchTransactionData();
  }, [isOwner, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, courtsRes, bookingsRes] = await Promise.all([
        axios.get("/api/courts/owner/dashboard"),
        axios.get("/api/courts/my-courts"),
        axios.get("/api/bookings/my-bookings"),
      ]);

      setStats(dashboardRes.data);
      setCourts(courtsRes.data.courts || []);
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Lỗi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionData = async () => {
    try {
      const [transactionsRes, statsRes] = await Promise.all([
        axios.get("/api/transactions/my-transactions", {
          params: { limit: 10 },
        }),
        axios.get("/api/transactions/owner-stats"),
      ]);

      setTransactions(transactionsRes.data.transactions || []);
      setTransactionStats(statsRes.data || {});
    } catch (error) {
      console.error("Error fetching transaction data:", error);
    }
  };

  const confirmBooking = async (bookingId) => {
    try {
      setActionLoading(true);
      await axios.put(`/api/bookings/${bookingId}/confirm`);
      toast.success("Xác nhận booking thành công!");
      fetchDashboardData();
    } catch (error) {
      toast.error("Lỗi xác nhận booking");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (window.confirm("Bạn có chắc muốn hủy booking này?")) {
      try {
        setActionLoading(true);
        await axios.put(`/api/bookings/${bookingId}/cancel`);
        toast.success("Hủy booking thành công!");
        fetchDashboardData();
      } catch (error) {
        toast.error("Lỗi hủy booking");
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handlePostCourt = async () => {
    try {
      setActionLoading(true);
      const response = await axios.post(
        `/api/courts/${selectedCourt._id}/post`,
        {
          days: postingDays,
        }
      );

      // Update user wallet balance
      updateUser({ ...user, walletBalance: response.data.newBalance });

      toast.success("Đăng sân nổi bật thành công!");
      setShowPostingModal(false);
      setPostingDays(1);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi đăng sân nổi bật");
    } finally {
      setActionLoading(false);
    }
  };

  const stopPosting = async (courtId) => {
    if (window.confirm("Bạn có chắc muốn dừng đăng sân nổi bật?")) {
      try {
        await axios.post(`/api/courts/${courtId}/stop-posting`);
        toast.success("Dừng đăng sân nổi bật thành công!");
        fetchDashboardData();
      } catch (error) {
        toast.error("Lỗi dừng đăng sân nổi bật");
      }
    }
  };

  // Chart colors
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" size="lg" />
        <p className="mt-3">Đang tải dữ liệu...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <i className="fas fa-chart-line me-2"></i>
                Owner Dashboard
              </h2>
              <p className="text-muted">Quản lý sân và theo dõi doanh thu</p>
            </div>
            <div>
              <Button
                variant="primary"
                onClick={() => navigate("/my-courts/add")}
              >
                <i className="fas fa-plus me-1"></i>
                Thêm sân mới
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Thông báo trạng thái tài khoản */}
      {!user.isApproved && (
        <Alert variant="warning" className="mb-4">
          <Alert.Heading>
            <i className="fas fa-exclamation-triangle me-2"></i>
            Tài khoản chưa được duyệt
          </Alert.Heading>
          <p className="mb-0">
            Tài khoản chủ sân của bạn đang chờ admin duyệt. Sau khi được duyệt,
            bạn sẽ có thể quản lý sân và nhận booking.
          </p>
        </Alert>
      )}

      {/* Stats Overview */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100 border-primary">
            <Card.Body>
              <i className="fas fa-building fa-2x text-primary mb-2"></i>
              <h4 className="text-primary">{stats.totalCourts}</h4>
              <p className="text-muted mb-0">Tổng số sân</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-success">
            <Card.Body>
              <i className="fas fa-calendar-check fa-2x text-success mb-2"></i>
              <h4 className="text-success">{stats.totalBookings}</h4>
              <p className="text-muted mb-0">Tổng booking</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-warning">
            <Card.Body>
              <i className="fas fa-money-bill-wave fa-2x text-warning mb-2"></i>
              <h4 className="text-warning">
                {(stats.totalRevenue || 0).toLocaleString("vi-VN")}đ
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
                {(user.walletBalance || 0).toLocaleString("vi-VN")}đ
              </h4>
              <p className="text-muted mb-0">Số dư ví</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-chart-line me-2"></i>
                Doanh thu theo tháng
              </h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `${value.toLocaleString("vi-VN")}đ`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    name="Doanh thu"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-chart-pie me-2"></i>
                Booking theo trạng thái
              </h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.bookingsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.bookingsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="courts" className="mb-4">
        {/* Tab Quản lý sân */}
        <Tab eventKey="courts" title={`Sân của tôi (${courts.length})`}>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-building me-2"></i>
                  Quản lý sân cầu lông
                </h5>
                <Button
                  variant="primary"
                  onClick={() => navigate("/my-courts/add")}
                >
                  <i className="fas fa-plus me-1"></i>
                  Thêm sân mới
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive striped hover className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Thông tin sân</th>
                    <th>Giá thuê</th>
                    <th>Trạng thái</th>
                    <th>Đăng bài</th>
                    <th>Booking hôm nay</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {courts.map((court) => (
                    <tr key={court._id}>
                      <td>
                        <div>
                          <strong>{court.name}</strong>
                          <br />
                          <small className="text-muted">
                            {court.address}, {court.district}
                          </small>
                          <br />
                          <small className="text-muted">
                            {court.openTime} - {court.closeTime}
                          </small>
                        </div>
                      </td>
                      <td className="text-success">
                        {court.pricePerHour?.toLocaleString("vi-VN")}đ/h
                      </td>
                      <td>
                        <Badge
                          bg={
                            court.status === "active"
                              ? "success"
                              : court.status === "pending"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {court.status === "active"
                            ? "Hoạt động"
                            : court.status === "pending"
                            ? "Chờ duyệt"
                            : "Bị từ chối"}
                        </Badge>
                        {court.rejectionReason && (
                          <>
                            <br />
                            <small className="text-danger">
                              Lý do: {court.rejectionReason}
                            </small>
                          </>
                        )}
                      </td>
                      <td>
                        {court.isPosted ? (
                          <div>
                            <Badge bg="success">
                              <i className="fas fa-star me-1"></i>
                              Nổi bật
                            </Badge>
                            <br />
                            <small className="text-muted">
                              Đến:{" "}
                              {new Date(
                                court.postingEndDate
                              ).toLocaleDateString("vi-VN")}
                            </small>
                            <br />
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => stopPosting(court._id)}
                            >
                              Dừng đăng
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Badge bg="secondary">Thường</Badge>
                            <br />
                            {court.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => {
                                  setSelectedCourt(court);
                                  setShowPostingModal(true);
                                }}
                              >
                                Đăng nổi bật
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="text-primary">
                          {court.todayBookings || 0} booking
                        </span>
                        <br />
                        <small className="text-success">
                          {(court.todayRevenue || 0).toLocaleString("vi-VN")}đ
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            size="sm"
                            variant="info"
                            onClick={() => navigate(`/courts/${court._id}`)}
                            title="Xem chi tiết"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() =>
                              navigate(`/my-courts/edit/${court._id}`)
                            }
                            title="Chỉnh sửa"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {courts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <div className="text-muted">
                          <i className="fas fa-building fa-3x mb-3"></i>
                          <p>Bạn chưa có sân nào</p>
                          <Button
                            variant="primary"
                            onClick={() => navigate("/my-courts/add")}
                          >
                            <i className="fas fa-plus me-1"></i>
                            Thêm sân đầu tiên
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Tab Quản lý booking */}
        <Tab eventKey="bookings" title={`Booking (${bookings.length})`}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-calendar-check me-2"></i>
                Quản lý đặt sân
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive striped hover className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Sân</th>
                    <th>Khách hàng</th>
                    <th>Ngày & Giờ</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th>Ngày đặt</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 20).map((booking) => (
                    <tr key={booking._id}>
                      <td>
                        <strong>{booking.court?.name}</strong>
                        <br />
                        <small className="text-muted">
                          {booking.court?.address}
                        </small>
                      </td>
                      <td>
                        <strong>{booking.player?.name}</strong>
                        <br />
                        <small className="text-muted">
                          {booking.player?.phone}
                        </small>
                        <br />
                        <small className="text-muted">
                          {booking.player?.email}
                        </small>
                      </td>
                      <td>
                        {new Date(booking.date).toLocaleDateString("vi-VN")}
                        <br />
                        <small>
                          {booking.startTime} - {booking.endTime}
                        </small>
                      </td>
                      <td className="text-success">
                        {booking.totalPrice?.toLocaleString("vi-VN")}đ
                      </td>
                      <td>
                        <Badge
                          bg={
                            booking.status === "confirmed"
                              ? "success"
                              : booking.status === "pending"
                              ? "warning"
                              : booking.status === "cancelled"
                              ? "danger"
                              : "info"
                          }
                        >
                          {booking.status === "confirmed"
                            ? "Đã xác nhận"
                            : booking.status === "pending"
                            ? "Chờ xác nhận"
                            : booking.status === "cancelled"
                            ? "Đã hủy"
                            : "Hoàn thành"}
                        </Badge>
                      </td>
                      <td>
                        <small>
                          {new Date(booking.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {booking.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => confirmBooking(booking._id)}
                                disabled={actionLoading}
                                title="Xác nhận"
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => cancelBooking(booking._id)}
                                disabled={actionLoading}
                                title="Hủy"
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="info"
                            onClick={() => navigate(`/bookings/${booking._id}`)}
                            title="Xem chi tiết"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <div className="text-muted">
                          <i className="fas fa-calendar-times fa-3x mb-3"></i>
                          <p>Chưa có booking nào</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Tab Lịch sử giao dịch */}
        <Tab eventKey="transactions" title="Lịch sử giao dịch">
          <Row>
            <Col md={8}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="fas fa-history me-2"></i>
                    Giao dịch gần đây
                  </h5>
                  <Link
                    to="/transactions"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Xem tất cả
                  </Link>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table responsive striped hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Thời gian</th>
                        <th>Loại</th>
                        <th>Mô tả</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 8).map((transaction) => (
                        <tr key={transaction._id}>
                          <td>
                            <small>
                              {new Date(
                                transaction.createdAt
                              ).toLocaleDateString("vi-VN")}
                              <br />
                              {new Date(
                                transaction.createdAt
                              ).toLocaleTimeString("vi-VN")}
                            </small>
                          </td>
                          <td>
                            <Badge
                              bg={
                                transaction.type === "booking_revenue"
                                  ? "success"
                                  : transaction.type === "system_fee"
                                  ? "secondary"
                                  : transaction.type === "posting_fee"
                                  ? "warning"
                                  : "info"
                              }
                            >
                              {transaction.type === "booking_revenue"
                                ? "Doanh thu"
                                : transaction.type === "system_fee"
                                ? "Phí hệ thống"
                                : transaction.type === "posting_fee"
                                ? "Phí đăng sân"
                                : transaction.type === "booking_refund"
                                ? "Hoàn tiền"
                                : transaction.type}
                            </Badge>
                          </td>
                          <td>
                            <div
                              className="text-truncate"
                              style={{ maxWidth: "200px" }}
                            >
                              {transaction.description}
                            </div>
                          </td>
                          <td>
                            <span
                              className={
                                transaction.amount > 0
                                  ? "text-success"
                                  : "text-danger"
                              }
                            >
                              {transaction.amount > 0 ? "+" : ""}
                              {transaction.amount.toLocaleString("vi-VN")}đ
                            </span>
                          </td>
                          <td>
                            <Badge
                              bg={
                                transaction.status === "completed"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {transaction.status === "completed"
                                ? "Hoàn thành"
                                : "Đang xử lý"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-4">
                            <div className="text-muted">
                              <i className="fas fa-history fa-3x mb-3"></i>
                              <p>Chưa có giao dịch nào</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Thống kê giao dịch</h5>
                </Card.Header>
                <Card.Body>
                  {transactionStats.stats &&
                  transactionStats.stats.length > 0 ? (
                    <div className="space-y-3">
                      {transactionStats.stats.map((stat) => (
                        <div
                          key={stat._id}
                          className="d-flex justify-content-between align-items-center border-bottom pb-2"
                        >
                          <span className="text-muted">
                            {stat._id === "booking_revenue"
                              ? "Doanh thu booking"
                              : stat._id === "system_fee"
                              ? "Phí hệ thống"
                              : stat._id === "posting_fee"
                              ? "Phí đăng sân"
                              : stat._id}
                          </span>
                          <div className="text-end">
                            <div
                              className={
                                stat.totalAmount > 0
                                  ? "text-success"
                                  : "text-danger"
                              }
                            >
                              {stat.totalAmount > 0 ? "+" : ""}
                              {stat.totalAmount.toLocaleString("vi-VN")}đ
                            </div>
                            <small className="text-muted">
                              ({stat.count} giao dịch)
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted">
                      <i className="fas fa-chart-pie fa-3x mb-3"></i>
                      <p>Chưa có dữ liệu thống kê</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      {/* Modal đăng sân nổi bật */}
      <Modal show={showPostingModal} onHide={() => setShowPostingModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-star me-2 text-warning"></i>
            Đăng sân nổi bật: {selectedCourt?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Số ngày đăng *</Form.Label>
            <Form.Select
              value={postingDays}
              onChange={(e) => setPostingDays(parseInt(e.target.value))}
            >
              <option value={1}>1 ngày (10,000đ)</option>
              <option value={7}>7 ngày (60,000đ) - Tiết kiệm 10,000đ</option>
              <option value={30}>
                30 ngày (200,000đ) - Tiết kiệm 100,000đ
              </option>
            </Form.Select>
          </Form.Group>

          <Alert variant="info">
            <small>
              <i className="fas fa-info-circle me-1"></i>
              Sân nổi bật sẽ được hiển thị ưu tiên trong danh sách tìm kiếm và
              có badge đặc biệt.
            </small>
          </Alert>

          <div className="d-flex justify-content-between align-items-center">
            <strong>
              Chi phí:{" "}
              {(postingDays === 1
                ? 10000
                : postingDays === 7
                ? 60000
                : 200000
              ).toLocaleString("vi-VN")}
              đ
            </strong>
            <small className="text-muted">
              Số dư hiện tại: {user.walletBalance?.toLocaleString("vi-VN")}đ
            </small>
          </div>

          {user.walletBalance <
            (postingDays === 1
              ? 10000
              : postingDays === 7
              ? 60000
              : 200000) && (
            <Alert variant="warning" className="mt-2">
              <small>Số dư không đủ. Vui lòng nạp thêm tiền vào ví.</small>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPostingModal(false)}
          >
            Hủy
          </Button>
          <Button
            variant="warning"
            onClick={handlePostCourt}
            disabled={
              actionLoading ||
              user.walletBalance <
                (postingDays === 1 ? 10000 : postingDays === 7 ? 60000 : 200000)
            }
          >
            {actionLoading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Đang xử lý...
              </>
            ) : (
              <>
                <i className="fas fa-star me-1"></i>
                Đăng sân nổi bật
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default OwnerDashboard;
