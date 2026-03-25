import React from "react";
import "./Contact.css";

export default function Contact() {
  return (
    <div className="contact-page">
      <h1>Contact Us</h1>
      <p className="intro">
        We are here to help. Whether you have an order question, product inquiry,
        or simply want to say hello, our team is ready to assist.
      </p>

      <section>
        <h2>Customer Support</h2>
        <ul>
          <li>Email: Supportbememarket@gmailcom</li>
          <li>Phone: 0xxxxxxxxx</li>
          <li>Response time: Within 24 hours (Monday–Friday)</li>
        </ul>
      </section>

      <section>
        <h2>Send Us a Message</h2>
        <p>Whatsapp Number: +233xxxxxxxxxx</p>
      </section>

      <p className="cta">
        We look forward to hearing from you. Get in touch with Beme Market today.
      </p>
    </div>
  );
}