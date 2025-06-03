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
  Modal,
  Tab,
  Tabs,
  Alert,
  Spinner,
  InputGroup,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
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
} from "recharts";

const AdminDashboard = () => {
  const { isAdmin, user, token } = useAuth();
  const navigate = useNavigate();

  // States
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourts: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    totalSystemRevenue: 0,
    totalPostingRevenue: 0,
    pendingCourts: 0,
    pendingOwners: 0,
    monthlyBookings: [],
  });

  const [owners, setOwners] = useState([]);
  const [courts, setCourts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerTransactions, setOwnerTransactions] = useState([]);

  // Pagination & Filters
  const [ownerPage, setOwnerPage] = useState(1);
  const [courtPage, setCourtPage] = useState(1);
  const [transactionPage, setTransactionPage] = useState(1);

  const [ownerFilter, setOwnerFilter] = useState({ search: "", status: "" });
  const [courtFilter, setCourtFilter] = useState({ search: "", status: "" });
  const [transactionFilter, setTransactionFilter] = useState({
    type: "",
  });

  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showOwnerDetailModal, setShowOwnerDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!token) {
      toast.error("Vui lòng đăng nhập");
      navigate("/login");
      return;
    }

    if (!isAdmin) {
      toast.error("Bạn không có quyền truy cập trang này");
      navigate("/");
      return;
    }

    fetchAllData();
  }, [token, isAdmin, navigate]);

  // Fetch data when filters change
  useEffect(() => {
    if (token && isAdmin) {
      fetchOwners();
    }
  }, [ownerPage, ownerFilter, token, isAdmin]);

  useEffect(() => {
    if (token && isAdmin) {
      fetchCourts();
    }
  }, [courtPage, courtFilter, token, isAdmin]);

  useEffect(() => {
    if (token && isAdmin) {
      fetchTransactions();
    }
  }, [transactionPage, transactionFilter, token, isAdmin]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "http://localhost:5000/api/admin/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Dashboard response:", response.data); // Debug log

      const data = response.data;
      setStats({
        totalUsers: data.totalUsers || 0,
        totalCourts: data.totalCourts || 0,
        totalBookings: data.totalBookings || 0,
        totalRevenue: data.totalBookingRevenue || 0, // SỬA: đổi từ totalRevenue thành totalBookingRevenue
        totalTransactions: data.totalTransactions || 0,
        totalSystemRevenue: data.totalSystemRevenue || 0,
        totalPostingRevenue: data.totalPostingRevenue || 0,
        pendingCourts: data.pendingCourts || 0,
        pendingOwners: data.pendingOwners || 0,
        monthlyBookings: data.monthlyRevenue || [], // SỬA: đổi từ monthlyBookings thành monthlyRevenue
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      handleApiError(error, "Lỗi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/admin/owners?page=${ownerPage}&search=${ownerFilter.search}&status=${ownerFilter.status}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setOwners(response.data.owners || []);
    } catch (error) {
      console.error("Error fetching owners:", error);
    }
  };

  const fetchCourts = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/admin/courts?page=${courtPage}&status=${courtFilter.status}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCourts(response.data.courts || []);
    } catch (error) {
      console.error("Error fetching courts:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/admin/transactions?page=${transactionPage}&type=${transactionFilter.type}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchOwnerTransactions = async (ownerId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/admin/owners/${ownerId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setOwnerTransactions(response.data.transactions || []);
      setSelectedOwner(response.data.owner);
    } catch (error) {
      toast.error("Lỗi tải giao dịch chủ sân");
    }
  };

  const approveOwner = async (userId) => {
    try {
      setActionLoading(true);
      await axios.put(
        `http://localhost:5000/api/admin/approve-owner/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Duyệt chủ sân thành công");
      fetchOwners();
      fetchAllData(); // Refresh stats
    } catch (error) {
      handleApiError(error, "Lỗi duyệt chủ sân");
    } finally {
      setActionLoading(false);
    }
  };

  const approveCourt = async (courtId) => {
    try {
      setActionLoading(true);
      await axios.put(
        `http://localhost:5000/api/admin/approve-court/${courtId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Duyệt sân thành công");
      fetchCourts();
      fetchAllData();
    } catch (error) {
      handleApiError(error, "Lỗi duyệt sân");
    } finally {
      setActionLoading(false);
    }
  };

  const rejectCourt = async () => {
    if (!rejectionReason.trim() || rejectionReason.length < 10) {
      toast.error("Lý do từ chối phải có ít nhất 10 ký tự");
      return;
    }

    try {
      setActionLoading(true);
      await axios.put(
        `http://localhost:5000/api/admin/reject-court/${selectedItem}`,
        {
          reason: rejectionReason,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Từ chối sân thành công");
      setShowRejectModal(false);
      setRejectionReason("");
      fetchCourts();
      fetchAllData();
    } catch (error) {
      handleApiError(error, "Lỗi từ chối sân");
    } finally {
      setActionLoading(false);
    }
  };

  const suspendUser = async (userId) => {
    try {
      setActionLoading(true);
      await axios.put(
        `http://localhost:5000/api/admin/suspend-user/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Cập nhật trạng thái tài khoản thành công");
      fetchOwners();
    } catch (error) {
      handleApiError(error, "Lỗi cập nhật trạng thái tài khoản");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApiError = (error, defaultMessage) => {
    console.error("API Error:", error);

    if (error.response?.status === 401) {
      toast.error("Phiên đăng nhập đã hết hạn");
      navigate("/login");
    } else if (error.response?.status === 403) {
      toast.error("Bạn không có quyền truy cập");
      navigate("/");
    } else {
      toast.error(error.response?.data?.message || defaultMessage);
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-4 text-center">
        <Spinner animation="border" variant="primary" size="lg" />
        <p className="mt-3 text-muted">Đang tải dữ liệu admin...</p>
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
              <h2 className="mb-1">
                <i className="fas fa-tachometer-alt me-2 text-primary"></i>
                Admin Dashboard
              </h2>
              <p className="text-muted mb-0">
                Xin chào, {user?.name} | Hệ thống quản lý sân cầu lông
              </p>
            </div>
            <div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={fetchAllData}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-1"></i>
                Làm mới
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Alert for pending items */}
      {(stats.pendingOwners > 0 || stats.pendingCourts > 0) && (
        <Row className="mb-4">
          <Col>
            <Alert variant="warning" className="d-flex align-items-center">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <div>
                <strong>Cần xử lý:</strong>
                {stats.pendingOwners > 0 && (
                  <span className="ms-2">
                    {stats.pendingOwners} chủ sân chờ duyệt
                  </span>
                )}
                {stats.pendingCourts > 0 && (
                  <span className="ms-2">
                    {stats.pendingCourts} sân chờ duyệt
                  </span>
                )}
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="h-100 border-start border-primary border-4">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="text-primary">{stats.totalUsers}</h4>
                  <p className="mb-0">Tổng người dùng</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-users fa-2x text-primary opacity-75"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-start border-success border-4">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="text-success">{stats.totalCourts}</h4>
                  <p className="mb-0">Tổng sân</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-map-marker-alt fa-2x text-success opacity-75"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-start border-info border-4">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="text-info">{stats.totalBookings}</h4>
                  <p className="mb-0">Tổng đặt sân</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-calendar-check fa-2x text-info opacity-75"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-start border-warning border-4">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="text-warning">
                    {stats.totalRevenue?.toLocaleString("vi-VN")}đ
                  </h4>
                  <p className="mb-0">Tổng doanh thu</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-money-bill-wave fa-2x text-warning opacity-75"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="bg-gradient-primary text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4>{stats.totalSystemRevenue?.toLocaleString("vi-VN")}đ</h4>
                  <p className="mb-0">Doanh thu phí hệ thống (5%)</p>
                </div>
                <i className="fas fa-percentage fa-2x opacity-75"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="bg-gradient-success text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4>{stats.totalPostingRevenue?.toLocaleString("vi-VN")}đ</h4>
                  <p className="mb-0">Doanh thu phí đăng sân</p>
                </div>
                <i className="fas fa-star fa-2x opacity-75"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="bg-gradient-info text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4>
                    {(
                      (stats.totalSystemRevenue || 0) +
                      (stats.totalPostingRevenue || 0)
                    ).toLocaleString("vi-VN")}
                    đ
                  </h4>
                  <p className="mb-0">Tổng doanh thu Admin</p>
                </div>
                <i className="fas fa-coins fa-2x opacity-75"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="bg-gradient-warning text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4>{stats.totalBookingRevenue?.toLocaleString("vi-VN")}đ</h4>
                  <p className="mb-0">Tổng doanh thu hệ thống</p>
                </div>
                <i className="fas fa-chart-line fa-2x opacity-75"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5>Doanh thu theo tháng</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyBookings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `${value?.toLocaleString("vi-VN")}đ`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    name="Doanh thu"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5>Booking theo tháng</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthlyBookings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Tabs defaultActiveKey="owners" className="mb-3">
        {/* Owners Tab */}
        <Tab eventKey="owners" title={`Chủ sân (${owners.length})`}>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">Quản lý chủ sân</h5>
                </Col>
                <Col md={4}>
                  <InputGroup>
                    <Form.Control
                      placeholder="Tìm kiếm chủ sân..."
                      value={ownerFilter.search}
                      onChange={(e) =>
                        setOwnerFilter({
                          ...ownerFilter,
                          search: e.target.value,
                        })
                      }
                    />
                    <Button onClick={fetchOwners}>
                      <i className="fas fa-search"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={ownerFilter.status}
                    onChange={(e) =>
                      setOwnerFilter({ ...ownerFilter, status: e.target.value })
                    }
                  >
                    <option value="">Tất cả</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="pending">Chờ duyệt</option>
                  </Form.Select>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover>
                <thead className="table-dark">
                  <tr>
                    <th>Chủ sân</th>
                    <th>Thông tin liên hệ</th>
                    <th>Trạng thái</th>
                    <th>Thống kê sân</th>
                    <th>Doanh thu</th>
                    <th>Số dư ví</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr key={owner._id}>
                      <td>
                        <div>
                          <strong>{owner.name}</strong>
                          {owner.businessName && (
                            <>
                              <br />
                              <small className="text-muted">
                                {owner.businessName}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <i className="fas fa-envelope me-1"></i>
                          {owner.email}
                          <br />
                          <i className="fas fa-phone me-1"></i>
                          {owner.phone}
                        </div>
                      </td>
                      <td>
                        <div>
                          <Badge bg={owner.isApproved ? "success" : "warning"}>
                            {owner.isApproved ? "Đã duyệt" : "Chờ duyệt"}
                          </Badge>
                          <br />
                          <Badge bg={owner.isActive ? "success" : "danger"}>
                            {owner.isActive ? "Hoạt động" : "Đã khóa"}
                          </Badge>
                        </div>
                      </td>
                      <td>
                        <div>
                          <small>
                            <strong>{owner.stats?.totalCourts || 0}</strong> sân
                            <br />
                            <span className="text-success">
                              {owner.stats?.approvedCourts || 0} đã duyệt
                            </span>
                            <br />
                            <span className="text-info">
                              {owner.stats?.postedCourts || 0} nổi bật
                            </span>
                          </small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong className="text-success">
                            {owner.stats?.totalRevenue?.toLocaleString(
                              "vi-VN"
                            ) || 0}
                            đ
                          </strong>
                          <br />
                          <small className="text-muted">
                            {owner.stats?.totalBookings || 0} booking
                          </small>
                          <br />
                          <small className="text-danger">
                            Phí:{" "}
                            {owner.stats?.systemFeesPaid?.toLocaleString(
                              "vi-VN"
                            ) || 0}
                            đ
                          </small>
                        </div>
                      </td>
                      <td>
                        <strong className="text-primary">
                          {owner.stats?.walletBalance?.toLocaleString(
                            "vi-VN"
                          ) || 0}
                          đ
                        </strong>
                        <br />
                        <small className="text-warning">
                          Phí đăng:{" "}
                          {owner.stats?.postingFeesPaid?.toLocaleString(
                            "vi-VN"
                          ) || 0}
                          đ
                        </small>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          {!owner.isApproved && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => approveOwner(owner._id)}
                              disabled={actionLoading}
                            >
                              <i className="fas fa-check me-1"></i>
                              Duyệt
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={owner.isActive ? "danger" : "success"}
                            onClick={() => suspendUser(owner._id)}
                            disabled={actionLoading}
                          >
                            <i
                              className={`fas fa-${
                                owner.isActive ? "lock" : "unlock"
                              } me-1`}
                            ></i>
                            {owner.isActive ? "Khóa" : "Mở"}
                          </Button>
                          <Button
                            size="sm"
                            variant="info"
                            onClick={() => {
                              fetchOwnerTransactions(owner._id);
                              setShowOwnerDetailModal(true);
                            }}
                          >
                            <i className="fas fa-eye me-1"></i>
                            Chi tiết
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Courts Tab */}
        <Tab eventKey="courts" title={`Sân (${courts.length})`}>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">Quản lý sân cầu lông</h5>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={courtFilter.status}
                    onChange={(e) =>
                      setCourtFilter({ ...courtFilter, status: e.target.value })
                    }
                  >
                    <option value="">Tất cả</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                  </Form.Select>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover>
                <thead className="table-dark">
                  <tr>
                    <th>Tên sân</th>
                    <th>Chủ sân</th>
                    <th>Địa chỉ</th>
                    <th>Giá</th>
                    <th>Trạng thái</th>
                    <th>Thống kê</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {courts.map((court) => (
                    <tr key={court._id}>
                      <td>
                        <div>
                          <strong>{court.name}</strong>
                          {court.isPosted && (
                            <Badge bg="warning" className="ms-2">
                              Nổi bật
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{court.owner?.name}</strong>
                          <br />
                          <small className="text-muted">
                            {court.owner?.email}
                          </small>
                        </div>
                      </td>
                      <td>
                        <small>
                          {court.address}, {court.district}, {court.city}
                        </small>
                      </td>
                      <td>
                        <strong>
                          {court.pricePerHour?.toLocaleString("vi-VN")}đ/h
                        </strong>
                      </td>
                      <td>
                        <div>
                          <Badge bg={court.isApproved ? "success" : "warning"}>
                            {court.isApproved ? "Đã duyệt" : "Chờ duyệt"}
                          </Badge>
                          <br />
                          <Badge
                            bg={
                              court.status === "active"
                                ? "success"
                                : court.status === "rejected"
                                ? "danger"
                                : "secondary"
                            }
                          >
                            {court.status === "active"
                              ? "Hoạt động"
                              : court.status === "rejected"
                              ? "Bị từ chối"
                              : court.status}
                          </Badge>
                        </div>
                      </td>
                      <td>
                        <div>
                          <small>
                            <strong>{court.stats?.totalBookings || 0}</strong>{" "}
                            booking
                            <br />
                            <span className="text-success">
                              {court.stats?.totalRevenue?.toLocaleString(
                                "vi-VN"
                              ) || 0}
                              đ
                            </span>
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          {!court.isApproved && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => approveCourt(court._id)}
                              disabled={actionLoading}
                            >
                              <i className="fas fa-check me-1"></i>
                              Duyệt
                            </Button>
                          )}
                          {!court.isApproved && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setSelectedItem(court._id);
                                setShowRejectModal(true);
                              }}
                              disabled={actionLoading}
                            >
                              <i className="fas fa-times me-1"></i>
                              Từ chối
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Transactions Tab */}
        <Tab
          eventKey="transactions"
          title={`Giao dịch (${transactions.length})`}
        >
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">Tất cả giao dịch</h5>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={transactionFilter.type}
                    onChange={(e) =>
                      setTransactionFilter({
                        ...transactionFilter,
                        type: e.target.value,
                      })
                    }
                  >
                    <option value="">Tất cả loại</option>
                    <option value="topup">Nạp tiền</option>
                    <option value="booking_payment">Thanh toán booking</option>
                    <option value="booking_revenue">Doanh thu booking</option>
                    <option value="system_fee">Phí hệ thống</option>
                    <option value="posting_fee">Phí đăng sân</option>
                  </Form.Select>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover>
                <thead className="table-dark">
                  <tr>
                    <th>Thời gian</th>
                    <th>Người dùng</th>
                    <th>Loại</th>
                    <th>Mô tả</th>
                    <th>Số tiền</th>
                    <th>Số dư sau</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction._id}>
                      <td>
                        <small>
                          {new Date(transaction.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                          <br />
                          {new Date(transaction.createdAt).toLocaleTimeString(
                            "vi-VN"
                          )}
                        </small>
                      </td>
                      <td>
                        <div>
                          <strong>{transaction.user?.name}</strong>
                          <br />
                          <small className="text-muted">
                            {transaction.user?.email}
                          </small>
                          <br />
                          <Badge bg="secondary" size="sm">
                            {transaction.user?.role}
                          </Badge>
                        </div>
                      </td>
                      <td>
                        <Badge
                          bg={
                            transaction.type === "topup"
                              ? "success"
                              : transaction.type === "booking_payment"
                              ? "danger"
                              : transaction.type === "booking_revenue"
                              ? "success"
                              : transaction.type === "system_fee"
                              ? "warning"
                              : transaction.type === "posting_fee"
                              ? "info"
                              : "secondary"
                          }
                        >
                          {transaction.type}
                        </Badge>
                      </td>
                      <td>
                        <small>{transaction.description}</small>
                        {transaction.relatedCourt && (
                          <>
                            <br />
                            <small className="text-muted">
                              Sân: {transaction.relatedCourt.name}
                            </small>
                          </>
                        )}
                      </td>
                      <td>
                        <strong
                          className={
                            transaction.amount > 0
                              ? "text-success"
                              : "text-danger"
                          }
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount.toLocaleString("vi-VN")}đ
                        </strong>
                      </td>
                      <td>
                        <strong className="text-primary">
                          {transaction.balanceAfter?.toLocaleString("vi-VN") ||
                            0}
                          đ
                        </strong>
                      </td>
                      <td>
                        <Badge
                          bg={
                            transaction.status === "completed"
                              ? "success"
                              : transaction.status === "pending"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Owner Detail Modal */}
      <Modal
        show={showOwnerDetailModal}
        onHide={() => setShowOwnerDetailModal(false)}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết chủ sân: {selectedOwner?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOwner && (
            <Row>
              <Col md={4}>
                <Card className="mb-3">
                  <Card.Header>
                    <h6>Thông tin chủ sân</h6>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>Tên:</strong> {selectedOwner.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedOwner.email}
                    </p>
                    <p>
                      <strong>Điện thoại:</strong> {selectedOwner.phone}
                    </p>
                    {selectedOwner.businessName && (
                      <p>
                        <strong>Tên doanh nghiệp:</strong>{" "}
                        {selectedOwner.businessName}
                      </p>
                    )}
                    <p>
                      <strong>Số dư ví:</strong>
                      <span className="text-primary ms-2">
                        {selectedOwner.walletBalance?.toLocaleString("vi-VN") ||
                          0}
                        đ
                      </span>
                    </p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={8}>
                <Card>
                  <Card.Header>
                    <h6>Lịch sử giao dịch</h6>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table responsive hover>
                      <thead className="table-light">
                        <tr>
                          <th>Thời gian</th>
                          <th>Loại</th>
                          <th>Mô tả</th>
                          <th>Số tiền</th>
                          <th>Số dư sau</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerTransactions.map((transaction) => (
                          <tr key={transaction._id}>
                            <td>
                              <small>
                                {new Date(
                                  transaction.createdAt
                                ).toLocaleDateString("vi-VN")}
                              </small>
                            </td>
                            <td>
                              <Badge
                                bg={
                                  transaction.type === "booking_revenue"
                                    ? "success"
                                    : transaction.type === "system_fee"
                                    ? "warning"
                                    : transaction.type === "posting_fee"
                                    ? "info"
                                    : "secondary"
                                }
                                size="sm"
                              >
                                {transaction.type}
                              </Badge>
                            </td>
                            <td>
                              <small>{transaction.description}</small>
                            </td>
                            <td>
                              <strong
                                className={
                                  transaction.amount > 0
                                    ? "text-success"
                                    : "text-danger"
                                }
                              >
                                {transaction.amount > 0 ? "+" : ""}
                                {transaction.amount.toLocaleString("vi-VN")}đ
                              </strong>
                            </td>
                            <td>
                              <strong className="text-primary">
                                {transaction.balanceAfter?.toLocaleString(
                                  "vi-VN"
                                ) || 0}
                                đ
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      {/* Reject Court Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Từ chối sân</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Lý do từ chối *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do từ chối (ít nhất 10 ký tự)..."
            />
            <small className="text-muted">Lý do phải có ít nhất 10 ký tự</small>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={rejectCourt}
            disabled={actionLoading || rejectionReason.length < 10}
          >
            {actionLoading ? "Đang xử lý..." : "Từ chối"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;
