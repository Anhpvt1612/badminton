import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Spinner } from "react-bootstrap";

const PaymentSuccess = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/auth/me");
        updateUser(response.data);
        setLoading(false);
        setTimeout(() => navigate("/"), 3000); // Chuyển về trang chủ sau 3s
      } catch (error) {
        console.error("Error fetching user:", error);
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate, updateUser]);

  return (
    <div className="text-center mt-5">
      {loading ? (
        <Spinner animation="border" variant="primary" />
      ) : (
        <>
          <h2>Thanh toán thành công!</h2>
          <p>Số dư ví của bạn đã được cập nhật.</p>
          <p>Chuyển hướng về trang chủ trong giây lát...</p>
        </>
      )}
    </div>
  );
};

export default PaymentSuccess;
