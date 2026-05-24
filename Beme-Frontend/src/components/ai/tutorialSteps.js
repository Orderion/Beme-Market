/**
 * TUTORIAL_STEPS
 * Defines the tutorial steps for each dashboard page.
 * selector: CSS selector targeting the element to spotlight
 * title: short heading
 * description: what it does and why it matters
 */

export const TUTORIAL_STEPS = {

  home: [
    {
      selector:    null,
      title:       "Your Analytics Overview",
      description: "This is your store's command center. Everything you see here is real-time data about your business performance.",
    },
    {
      selector:    ".sd-stats-grid, [style*='grid-template-columns: repeat(2']",
      title:       "Your Key Metrics",
      description: "These 4 cards show Revenue, Orders, Approved orders, and Customers. The percentage shows how you're doing vs last month.",
    },
    {
      selector:    "[style*='BarChart'], .recharts-wrapper",
      title:       "Orders & Revenue Chart",
      description: "This chart shows your last 7 days of activity. Switch between Orders and Revenue view using the tabs above the chart.",
    },
    {
      selector:    "[style*='Order List'], [style*='order list']",
      title:       "Recent Orders",
      description: "Your most recent orders appear here. Click any order to see full details and update the status.",
    },
  ],

  products: [
    {
      selector:    "button[style*='+ Add Product'], button[style*='Add Product']",
      title:       "Add Product Button",
      description: "Click here to add a new product to your store. You can upload images, set price, add description, and choose a category.",
    },
    {
      selector:    "[style*='Product Usage']",
      title:       "Product Limit Bar",
      description: "This shows how many products you've used out of your plan limit. Upgrade your plan to list more products.",
    },
    {
      selector:    "[style*='Active'][style*='Draft'], [style*='grid-template-columns: repeat(3']",
      title:       "Product Status Summary",
      description: "Track how many products are Active (visible to buyers), Draft (hidden), or Out of Stock.",
    },
    {
      selector:    "input[placeholder*='Search']",
      title:       "Search & Filter",
      description: "Search your products by name or filter by status. Useful when you have many listings.",
    },
    {
      selector:    "[style*='dashed']",
      title:       "Product Cards",
      description: "Each card shows your product image, name, and price. Use the edit ✏️ icon to update it or the trash 🗑️ icon to delete it.",
    },
  ],

  orders: [
    {
      selector:    ".sd-page-head, [style*='sd-page-head']",
      title:       "Orders Overview",
      description: "All customer purchases appear here. New orders come in automatically whenever a buyer completes checkout.",
    },
    {
      selector:    ".sd-tabs, [style*='sd-tabs']",
      title:       "Order Status Filters",
      description: "Filter orders by: All, Pending, Processing, Delivered, or Cancelled. Always check Pending orders first — they need your attention.",
    },
    {
      selector:    ".sd-table, [style*='sd-table']",
      title:       "Order Table",
      description: "Each row shows the Order ID, Customer name, number of items, total amount, date, and current status.",
    },
  ],

  analytics: [
    {
      selector:    ".sd-stats-grid, [style*='sd-stats-grid']",
      title:       "Weekly Performance",
      description: "These cards summarise your last 7 days. Revenue, Orders, Visitors, and Conversion rate at a glance.",
    },
    {
      selector:    "[style*='Revenue Trend']",
      title:       "Revenue Trend Chart",
      description: "This area chart shows your daily revenue this week. A flat line means no sales — use the AI to find out why.",
    },
    {
      selector:    "[style*='Daily Orders']",
      title:       "Orders vs Visitors",
      description: "These two charts together show you something important: if visitors are high but orders are low, something is stopping buyers from purchasing.",
    },
  ],

  customers: [
    {
      selector:    ".sd-table, [style*='sd-table']",
      title:       "Customer List",
      description: "Every buyer who has ordered from your store appears here, sorted by total spend.",
    },
    {
      selector:    "th",
      title:       "Customer Columns",
      description: "Name, phone, number of orders, total spent, and whether they're a New or Repeat buyer. Repeat buyers are your most valuable customers.",
    },
  ],

  chat: [
    {
      selector:    ".sd-chat-list, [style*='sd-chat-list']",
      title:       "Conversation List",
      description: "All your customer conversations appear here. Blue numbers show unread messages that need a reply.",
    },
    {
      selector:    ".sd-chat-main, [style*='sd-chat-main']",
      title:       "Chat Area",
      description: "Click any conversation on the left to open it here. Type your reply at the bottom and press Send.",
    },
    {
      selector:    ".sd-chat-input-row, [style*='sd-chat-input-row']",
      title:       "Message Input + AI Reply",
      description: "Type your message here or click the ✨ AI button to generate a professional reply automatically based on what the customer said.",
    },
  ],

  marketing: [
    {
      selector:    "[style*='grid'][style*='auto-fill']",
      title:       "Marketing Tools",
      description: "These are the tools available to grow your store. Tools marked with a lock 🔒 require a higher plan.",
    },
    {
      selector:    "[style*='Flash Sales']",
      title:       "Flash Sales",
      description: "Create a time-limited sale with a countdown. Flash sales create urgency and can 3× your conversion rate temporarily.",
    },
    {
      selector:    "[style*='AI Captions']",
      title:       "AI Caption Generator",
      description: "This is a Pro feature. The AI writes ready-to-post captions for Instagram, TikTok, and WhatsApp for any of your products.",
    },
  ],

  withdrawals: [
    {
      selector:    "button[style*='Request Withdrawal']",
      title:       "Request Payout",
      description: "Click here to request a payout to your MoMo or bank account. Minimum withdrawal is GHS 50.",
    },
    {
      selector:    "[style*='stat-card'], .sd-stat-card",
      title:       "Balance Cards",
      description: "See your Pending Payouts and Total Withdrawn. Your available balance is updated after each completed order.",
    },
    {
      selector:    "[style*='Payout Policy']",
      title:       "Payout Policy",
      description: "Read this before requesting. Payouts are processed within 1–3 business days. Make sure your account details are correct.",
    },
  ],

  appearance: [
    {
      selector:    null,
      title:       "Store Design",
      description: "Customise how your store looks to buyers. A professional-looking store builds trust and increases sales.",
    },
  ],

  subscription: [
    {
      selector:    "[style*='current plan']",
      title:       "Your Current Plan",
      description: "This card shows what plan you're on, what it costs, and what's included.",
    },
    {
      selector:    "[style*='grid'][style*='auto-fill']",
      title:       "Available Plans",
      description: "Compare plans side by side. Upgrading unlocks more products, Beme Delivery, verified badge, and advanced features.",
    },
  ],

};