import React from "react";
import "./InfoPages.css";

export default function Contact() {
  return (
    <div className="info-page">
      <h1>Contact Us</h1>
      <p className="muted">
        We are here to help. Whether you have an order question, product inquiry,
        or simply want to say hello, our team is ready to assist across Ghana.
      </p>

      <div className="info-card">
        <h3>Customer Support</h3>
        <ul className="info-list">
          <li>Email: supportbememarket@gmail.com</li>
          <li>Phone: 0xxxxxxxxx</li>
          <li>Response time: Within 24 hours (Monday–Friday)</li>
        </ul>
      </div>

      <div className="info-card">
        <h3>Quick Contact</h3>
        <ul className="info-list">
          <li>WhatsApp: +233xxxxxxxxxx</li>
        </ul>
      </div>

      <div className="info-card">
        <p>
          We look forward to hearing from you. Get in touch with Beme Market
          today.
        </p>
      </div>
    </div>
  );
}