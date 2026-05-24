export const TUTORIAL_STEPS = {
  home:[
    { selector:null, title:"Your Analytics Overview", description:"This is your store command center. Everything here is real-time data about your business performance." },
    { selector:"[style*='grid-template-columns: repeat(2']", title:"Your Key Metrics", description:"These 4 cards show Revenue, Orders, Approved orders, and Customers. The percentage shows how you're doing vs last month." },
    { selector:".recharts-wrapper", title:"Orders & Revenue Chart", description:"This chart shows your last 7 days of activity. Switch between Orders and Revenue using the tabs above the chart." },
    { selector:"[style*='Order List']", title:"Recent Orders", description:"Your most recent orders appear here. New orders arrive automatically when a buyer completes checkout." },
  ],
  products:[
    { selector:"button[style*='Add Product']", title:"Add Product Button", description:"Click here to list a new product. You can upload images, set price, write a description, and choose a category." },
    { selector:"[style*='Product Usage']", title:"Product Limit Bar", description:"Shows how many products you've used out of your plan limit. Upgrade to list more products." },
    { selector:"[style*='grid-template-columns: repeat(3']", title:"Product Status", description:"Track Active (visible), Draft (hidden), and Out of Stock products at a glance." },
    { selector:"input[placeholder*='Search']", title:"Search & Filter", description:"Search by name or filter by status. Useful when you have many listings." },
    { selector:"[style*='dashed']", title:"Product Cards", description:"Each card shows image, name, and price. Use the pencil icon to edit or bin icon to delete." },
  ],
  orders:[
    { selector:".sd-page-head", title:"Orders Overview", description:"All customer purchases appear here. New orders come in automatically when buyers checkout." },
    { selector:".sd-tabs", title:"Order Status Filters", description:"Filter by All, Pending, Processing, Delivered, or Cancelled. Always check Pending first — they need your attention." },
    { selector:".sd-table", title:"Order Table", description:"Each row shows Order ID, Customer, items, total amount, date, and status." },
  ],
  analytics:[
    { selector:".sd-stats-grid", title:"Weekly Performance", description:"Revenue, Orders, Visitors, and Conversion rate for the last 7 days." },
    { selector:"[style*='Revenue Trend']", title:"Revenue Trend", description:"Daily revenue this week. A flat line means no sales — use AI to find out why." },
    { selector:"[style*='Daily Orders']", title:"Orders vs Visitors", description:"If visitors are high but orders are low, something is stopping buyers from purchasing." },
  ],
  customers:[
    { selector:".sd-table", title:"Customer List", description:"Every buyer who has ordered from your store, sorted by total spend." },
    { selector:"th", title:"Customer Columns", description:"Name, phone, orders, total spent, and New vs Repeat buyer status. Repeat buyers are your most valuable customers." },
  ],
  chat:[
    { selector:".sd-chat-list", title:"Conversation List", description:"All your customer conversations. Blue numbers show unread messages needing a reply." },
    { selector:".sd-chat-main", title:"Chat Area", description:"Click any conversation on the left to open it. Type your reply at the bottom." },
    { selector:".sd-chat-input-row", title:"Message Input + AI Reply", description:"Type your message or tap the ✨ button to generate a professional AI reply based on what the customer said." },
  ],
  marketing:[
    { selector:"[style*='auto-fill']", title:"Marketing Tools", description:"Tools to grow your store. Locked tools require a higher plan." },
    { selector:"[style*='Flash Sales']", title:"Flash Sales", description:"Create time-limited sales with a countdown. Can 3× your conversion rate temporarily." },
    { selector:"[style*='AI Captions']", title:"AI Caption Generator", description:"Pro feature — AI writes ready-to-post captions for Instagram, TikTok, and WhatsApp." },
  ],
  withdrawals:[
    { selector:"button[style*='Request Withdrawal']", title:"Request Payout", description:"Click to request a payout to your MoMo or bank. Minimum GHS 50." },
    { selector:".sd-stat-card", title:"Balance Cards", description:"Pending Payouts and Total Withdrawn. Balance updates after each completed order." },
    { selector:"[style*='Payout Policy']", title:"Payout Policy", description:"Payouts processed within 1–3 business days. Make sure account details are correct." },
  ],
  subscription:[
    { selector:"[style*='current plan']", title:"Your Current Plan", description:"Shows your plan, price, and what's included." },
    { selector:"[style*='auto-fill']", title:"Available Plans", description:"Compare plans side by side. Upgrading unlocks more products, Beme Delivery, and AI features." },
  ],
};
