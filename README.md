# HiMyAgent Chat Widget 🤖💼

The official integration client for [HiMyAgent.com](https://himyagent.com/). This widget allows businesses to deploy specialized AI agents that act as the first line of customer interaction, seamlessly integrated with your HiMyAgent dashboard.

## 🌟 The Use Case: AI-First Customer Support

Modern businesses face a volume of inquiries that human teams cannot handle 24/7. **HiMyAgent** provides a "Digital Front Desk" that manages these interactions automatically while maintaining a high-quality, branded experience.

### 1. Automated Concierge

Instead of a static FAQ, the widget provides an interactive agent trained on your specific business data. It can answer product questions, provide pricing, or explain services instantly.

### 2. Lead Qualification & Capture

The widget identifies potential customers and captures their session data. Using the `getPersistentUserId()` logic, it tracks returning visitors across the same domain, allowing for personalized follow-ups.

### 3. Seamless Human Handoff

When an inquiry becomes complex, the backend (integrated with this widget) logs the entire history. Staff members can view the transcript on the HiMyAgent dashboard to take over the conversation with full context.

### 4. Cross-Platform Consistency

By using the **Platform & PlatformUserId** architecture, HiMyAgent ensures that a user chatting via this website widget is recognized consistently, separate from users coming through other channels like WhatsApp or Messenger.

---

## 🛠️ How it Works for the End-User

1.  **Identity Generation**: Upon landing, the widget generates a unique, domain-branded ID (e.g., `yourshop.com-x82j1`).
2.  **Instant Engagement**: The AI welcomes the user based on your `welcome-message` attribute.
3.  **Streaming Intelligence**: As the AI "thinks," a typing animation is shown. Responses are streamed bit-by-bit for a "live" feel, reducing perceived wait times.
4.  **Rich Formatting**: Using the built-in Markdown support, the AI can send structured data like tables, bold text, and lists to make information easy to read.

## 🚀 Quick Start for HiMyAgent Users

Simply grab your `public-token` from your [HiMyAgent Dashboard](https://himyagent.com/dashboard) and add the following to your site:

```html
<agent-chat-widget
    api-url="[https://api.himyagent.com](https://api.himyagent.com)"
    public-token="YOUR_AGENT_TOKEN"
    title="Support Assistant"
    primary-color="#3d1f15"
>
</agent-chat-widget>

<script
    src="[https://cdn.jsdelivr.net/gh/gogettersdevelopment/hi_my_agent_widget/chat-widget.bundle.js](https://cdn.jsdelivr.net/gh/gogettersdevelopment/hi_my_agent_widget/chat-widget.bundle.js)"
    defer
></script>
```
