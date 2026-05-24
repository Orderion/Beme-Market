import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SUGGESTIONS = {
  home:        ["How do I increase my sales this week?","What does conversion rate mean?","How can I get more store visitors?","Explain my dashboard overview"],
  products:    ["Write a product description for me","How do I optimise my product title for SEO?","What's the best pricing strategy for new products?","How many images should each product have?"],
  orders:      ["How do I handle a customer complaint?","Write a professional reply for a delayed order","How do I reduce order cancellations?","What's the best way to manage refunds?"],
  analytics:   ["Explain my traffic drop this week","What is a good conversion rate?","Why are visitors not buying?","How do I read the analytics graph?"],
  marketing:   ["Write an Instagram caption for my product","Give me 5 TikTok ideas for my store","How do I run a flash sale?","Create a WhatsApp status for new arrivals"],
  customers:   ["Write a thank-you message for repeat buyers","How do I get more customer reviews?","Draft a follow-up for inactive buyers","How do I handle difficult customers?"],
  chat:        ["Write a professional reply to this message","How do I handle a pricing negotiation?","Draft a delivery update message","How do I politely decline a request?"],
  withdrawals: ["How does the payout process work?","What fees apply to withdrawals?","How do I increase my available balance?"],
  appearance:  ["How do I make my store look professional?","Tips for a high-converting store banner","How do I write a good store bio?"],
  subscription:["What's included in the Pro plan?","Is the Pro plan worth it for my store?","What AI features do I get with Pro?"],
  delivery:    ["What delivery options should I offer?","How do I set competitive delivery fees?","How do I handle delayed deliveries?"],
  verification:["How do I get verified on Beme?","What are the benefits of being verified?","How long does verification take?"],
};
const LABELS = { home:"Dashboard Home",products:"Products",orders:"Orders",analytics:"Analytics",marketing:"Marketing",customers:"Customers",chat:"Messages",withdrawals:"Withdrawals",appearance:"Store Design",subscription:"Subscription",delivery:"Delivery",verification:"Verification",security:"Security","ai-assistant":"AI Copilot" };

export function useAIContext() {
  const [params]      = useSearchParams();
  const { profile, user } = useAuth();
  const currentPage   = params.get("tab")||"home";
  const aiContext     = useMemo(()=>({ currentPage, shopName:profile?.shopName||profile?.storeName||"Your Store", sellerId:user?.uid||null, sellerEmail:user?.email||null, plan:profile?.subscriptionPlan||"basic" }),[currentPage,profile,user]);
  return { currentPage, pageLabel:LABELS[currentPage]||"Dashboard", suggestions:SUGGESTIONS[currentPage]||SUGGESTIONS.home, aiContext };
}
