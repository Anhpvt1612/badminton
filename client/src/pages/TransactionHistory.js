import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Form,
  Button,
  Pagination,
  Spinner,
  Alert,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";

const TransactionHistory = () => {
  const { user, isAuthenticated } = useAuth(); // THÊM isAuthenticated
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");

  const transactionTypes = {
    topup: { label: "Nạp tiền", color: "success", icon: "fa-plus" },
    booking_payment: {
      label: "Thanh toán booking",
      color: "danger",
      icon: "fa-minus",
    },
    booking_refund: { label: "Hoàn tiền", color: "info", icon: "fa-undo" },
    booking_revenue: {
      label: "Doanh thu booking",
      color: "success",
      icon: "fa-plus",
    },
    posting_fee: { label: "Phí đăng sân", color: "warning", icon: "fa-star" },
    system_fee: {
      label: "Phí hệ thống",
      color: "secondary",
      icon: "fa-percentage",
    },
    withdrawal: { label: "Rút tiền", color: "danger", icon: "fa-money-bill" },
  };

  useEffect(() => {
    if (isAuthenticated) {
      // CHỈ fetch khi đã đăng nhập
      fetchTransactions();
    }
  }, [currentPage, typeFilter, isAuthenticated]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // SỬA: Thêm full URL đúng với backend
      const response = await axios.get(
        "http://localhost:5000/api/transactions/my-transactions",
        {
          params: {
            page: currentPage,
            limit: 20,
            type: typeFilter,
          },
        }
      );

      setTransactions(response.data.transactions || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      if (error.response?.status === 401) {
        toast.error("Vui lòng đăng nhập lại để xem lịch sử giao dịch");
      } else {
        toast.error("Lỗi tải lịch sử giao dịch");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    const isPositive = amount > 0;
    return (
      <span className={isPositive ? "text-success" : "text-danger"}>
        {isPositive ? "+" : ""}
        {amount.toLocaleString("vi-VN")}đ
      </span>
    );
  };

  const getTransactionInfo = (type) => {
    return (
      transactionTypes[type] || {
        label: type,
        color: "secondary",
        icon: "fa-exchange-alt",
      }
    );
  };

  // THÊM: Kiểm tra authentication
  if (!isAuthenticated) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Vui lòng đăng nhập để xem lịch sử giao dịch
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-history me-2"></i>
            Lịch sử giao dịch
          </h2>
          <p className="text-muted">
            Theo dõi tất cả các giao dịch trong ví của bạn
          </p>
        </Col>
      </Row>

      {/* Filter */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Lọc theo loại giao dịch</Form.Label>
            <Form.Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              {Object.entries(transactionTypes).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6} className="d-flex align-items-end">
          <div className="text-end">
            <h5 className="mb-0">Số dư hiện tại</h5>
            <h3 className="text-primary">
              {user?.walletBalance?.toLocaleString("vi-VN") || 0}đ
            </h3>
          </div>
        </Col>
      </Row>

      {/* Transactions Table */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Danh sách giao dịch
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <p className="mt-2">Đang tải...</p>
            </div>
          ) : transactions.length === 0 ? (
            <Alert variant="info" className="m-3">
              <i className="fas fa-info-circle me-2"></i>
              Chưa có giao dịch nào
            </Alert>
          ) : (
            <Table responsive striped hover className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Thời gian</th>
                  <th>Loại giao dịch</th>
                  <th>Mô tả</th>
                  <th>Số tiền</th>
                  <th>Số dư trước</th>
                  <th>Số dư sau</th>
                  <th>Trạng thái</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const typeInfo = getTransactionInfo(transaction.type);
                  return (
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
                        <Badge bg={typeInfo.color}>
                          <i className={`fas ${typeInfo.icon} me-1`}></i>
                          {typeInfo.label}
                        </Badge>
                      </td>
                      <td>
                        <div>
                          {transaction.description}
                          {transaction.relatedCourt && (
                            <>
                              <br />
                              <small className="text-muted">
                                Sân: {transaction.relatedCourt.name}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="fw-bold">
                        {formatAmount(transaction.amount)}
                      </td>
                      {/* THÊM: Cột số dư trước */}
                      <td className="text-muted">
                        {transaction.balanceBefore?.toLocaleString("vi-VN") ||
                          "0"}
                        đ
                      </td>
                      {/* THÊM: Cột số dư sau */}
                      <td className="fw-bold text-primary">
                        {transaction.balanceAfter?.toLocaleString("vi-VN") ||
                          "0"}
                        đ
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
                          {transaction.status === "completed"
                            ? "Hoàn thành"
                            : transaction.status === "pending"
                            ? "Đang xử lý"
                            : "Thất bại"}
                        </Badge>
                      </td>
                      <td>
                        {transaction.relatedBooking && (
                          <small className="text-muted">
                            Booking:{" "}
                            {transaction.relatedBooking.date
                              ? new Date(
                                  transaction.relatedBooking.date
                                ).toLocaleDateString("vi-VN")
                              : "N/A"}
                          </small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer>
            <div className="d-flex justify-content-center">
              <Pagination>
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {[...Array(totalPages)].map((_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                />
              </Pagination>
            </div>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
};

export default TransactionHistory;
