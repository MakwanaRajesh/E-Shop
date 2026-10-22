import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        if self._pageNumber > 1:
            # Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#C9A84C"))
            self.drawString(54, 750, "NEXUS LUXURY E-COMMERCE")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#666666"))
            self.drawRightString(558, 750, "FULL-STACK INTERVIEW HANDBOOK & Q&A")
            self.setStrokeColor(colors.HexColor("#E5E5E5"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

            # Footer
            self.setStrokeColor(colors.HexColor("#E5E5E5"))
            self.setLineWidth(0.5)
            self.line(54, 45, 558, 45)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#888888"))
            self.drawString(54, 32, "Confidential • Candidate Interview Master Guide")
            self.drawRightString(558, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="NEXUS_ECommerce_Interview_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    gold_color = colors.HexColor("#9E7D2B")
    black_color = colors.HexColor("#1A1A1A")
    dark_gray = colors.HexColor("#333333")
    accent_emerald = colors.HexColor("#059669")
    accent_ruby = colors.HexColor("#DC2626")
    accent_sapphire = colors.HexColor("#0284C7")
    bg_light = colors.HexColor("#F9F9FB")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=black_color,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=gold_color,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=black_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=gold_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=dark_gray,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#222222")
    )

    q_style = ParagraphStyle(
        'Question',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    ans_style = ParagraphStyle(
        'Answer',
        parent=body_style,
        leftIndent=10,
        spaceAfter=6
    )

    story_tag_style = ParagraphStyle(
        'StoryTag',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    story_title_style = ParagraphStyle(
        'StoryTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=black_color,
        spaceAfter=4
    )

    story_body_style = ParagraphStyle(
        'StoryBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_gray,
        spaceAfter=4
    )

    story_bold_label = ParagraphStyle(
        'StoryLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E293B")
    )

    elements = []

    # ── COVER / TITLE HEADER ──────────────────────────────────────────────────
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("💎 NEXUS LUXURY E-COMMERCE", subtitle_style))
    elements.append(Paragraph("Full-Stack Interview Handbook & Q&A Master Guide", title_style))
    elements.append(Paragraph("Comprehensive preparation manual for Full-Stack, Frontend, Backend, and System Design interviews based on the production NEXUS platform.", body_style))
    elements.append(Spacer(1, 10))

    meta_table_data = [
        [
            Paragraph("<b>Stack:</b> Next.js 15, React 19, ASP.NET Core 9, PostgreSQL", body_style),
            Paragraph("<b>Architecture:</b> Headless, Clean Architecture, REST API", body_style),
        ],
        [
            Paragraph("<b>Candidate Role:</b> Full-Stack / Senior Web Engineer", body_style),
            Paragraph("<b>Deployment:</b> Vercel (Edge CDN) + Render (Docker)", body_style),
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F4F4F6")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#DDDDDD")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#EEEEEE")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 15))

    # ── SECTION 1: ELEVATOR PITCH ─────────────────────────────────────────────
    elements.append(Paragraph("1. Project Overview & Elevator Pitches", h1_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=gold_color, spaceBefore=2, spaceAfter=8))

    elements.append(Paragraph("30-Second Elevator Pitch (For Introductions):", h2_style))
    pitch_30 = (
        "<i>\"NEXUS is an enterprise-grade luxury fashion e-commerce platform built with Next.js 15 App Router, "
        "ASP.NET Core 9 Web API, and Neon Serverless PostgreSQL. It combines a haute horlogerie jewel-tone design system "
        "with high-converting e-commerce patterns inspired by AJIO and SHEIN—including a multi-level mega-menu, an interactive "
        "promotional coupon engine, a resilient Cash on Delivery checkout pipeline with automated address fallbacks, and a "
        "real-time admin portal with dynamic order status glow effects.\"</i>"
    )
    elements.append(Paragraph(pitch_30, body_style))

    elements.append(Paragraph("2-Minute Architectural Walkthrough (When Interviewers ask 'Walk me through your architecture'):", h2_style))
    walkthrough_pts = [
        "<b>Frontend (Next.js 15 & React 19):</b> Strategic mix of Server Components for instant SSR & SEO, and Client Components for interactive UI (Zustand for lightweight state, Radix UI primitives, Lucide icons, and Tailwind CSS). Shared JS bundle is only 103 kB.",
        "<b>Backend (.NET 9 C#):</b> Built on Clean Architecture (EShop.Core, EShop.Infrastructure, EShop.API) using ASP.NET Core Kestrel. Features custom JSON deserializers, IP rate limiting, and centralized RFC 7807 ProblemDetails middleware.",
        "<b>Persistence (Neon Serverless PostgreSQL):</b> Managed via Entity Framework Core 9 with code-first migrations and safe, idempotent startup seeding. ACID transactions guarantee zero inventory overselling.",
        "<b>DevOps & Hosting:</b> Dockerized with multi-stage builds. Frontend deployed on Vercel Edge Network; backend deployed as a containerized web service on Render with zero-trust CORS and automated health probes."
    ]
    for pt in walkthrough_pts:
        elements.append(Paragraph(f"• {pt}", bullet_style))
    elements.append(Spacer(1, 10))

    # ── SECTION 2: ARCHITECTURAL DECISIONS ────────────────────────────────────
    elements.append(Paragraph("2. Architectural Justifications: Why X Over Y?", h1_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=gold_color, spaceBefore=2, spaceAfter=8))

    comparisons = [
        ("Next.js 15 App Router vs. Traditional SPA (Vite / CRA)",
         "<b>Why Next.js:</b> E-commerce catalog discoverability relies entirely on search engine indexing (SEO). Traditional SPAs serve a blank HTML shell that harms crawler ranking and First Contentful Paint. Next.js 15 Server Components prerender HTML on the edge while keeping client bundle footprint minimal."),
        ("Zustand vs. Redux Toolkit",
         "<b>Why Zustand:</b> Redux introduces excessive boilerplate (actions, reducers, dispatchers) and adds ~15 kB to the bundle. Zustand is under 1.5 kB, has zero boilerplate (hook-based stores), and seamlessly supports local storage persistence with 1-line middleware for cart and wishlist."),
        ("ASP.NET Core 9 vs. Node.js / Express",
         "<b>Why .NET 9:</b> In enterprise commerce, type safety and throughput are paramount. Kestrel delivers 5-10x the throughput of single-threaded Node.js event loops, native Dependency Injection eliminates third-party container bloat, and C# strong types eliminate runtime type mismatches."),
        ("PostgreSQL (Neon Serverless) vs. MongoDB",
         "<b>Why PostgreSQL:</b> Financial transactions, coupons, and orders demand strict ACID consistency. Relational foreign key constraints prevent orphaned order items, while Neon provides serverless compute scaling and PgBouncer connection pooling.")
    ]
    for title, desc in comparisons:
        elements.append(Paragraph(title, h2_style))
        elements.append(Paragraph(desc, body_style))
    elements.append(Spacer(1, 10))

    # ── SECTION 3: REAL-WORLD CHALLENGES (STAR METHOD) ───────────────────────
    elements.append(Paragraph("3. Real-World Engineering Challenges (STAR Method)", h1_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=gold_color, spaceBefore=2, spaceAfter=8))
    elements.append(Paragraph("Interviewers love hearing how you debug and solve real, messy bugs. Use these stories:", body_style))

    # Story 1
    s1_content = [
        Paragraph("<b>STORY 1: Resolving the 400 Bad Request on Cash on Delivery Orders</b>", story_title_style),
        Paragraph("<b>Situation:</b> During final checkout testing, placing a Cash on Delivery order threw an ambiguous <code>400 Bad Request</code> error before reaching business logic.", story_body_style),
        Paragraph("<b>Task:</b> Track down the root cause in the ASP.NET Core request pipeline and restore seamless order placement.", story_body_style),
        Paragraph("<b>Action:</b><br/>"
                  "1. Audited Serilog logs and discovered the failure stemmed from Dependency Injection: <code>OrdersController</code> injected <code>IHttpClientFactory</code> for Razorpay, but <code>AddHttpClient()</code> was missing in <code>Program.cs</code>. ASP.NET Core threw an <code>InvalidOperationException</code>, which our <code>GlobalExceptionMiddleware</code> converted to a 400 Bad Request.<br/>"
                  "2. Also detected that the frontend sent <code>addressId: \"\"</code> (empty string) and payment method <code>\"cod\"</code> (lowercase string). Default .NET <code>System.Text.Json</code> failed to deserialize empty strings to <code>Guid?</code>.<br/>"
                  "3. Created custom converters (<code>NullableGuidConverter</code> & <code>PaymentMethodConverter</code>), registered <code>AddHttpClient()</code>, and added a 4-tier fallback address resolver.", story_body_style),
        Paragraph("<b>Result:</b> Order placement achieved 100% success rate with zero deserialization errors and instant ₹0 upfront COD confirmation.", story_body_style),
    ]
    s1_table = Table([[s1_content]], colWidths=[504])
    s1_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(s1_table)
    elements.append(Spacer(1, 10))

    # Story 2
    s2_content = [
        Paragraph("<b>STORY 2: Windows Background Process DLL Locking (MSB3026)</b>", story_title_style),
        Paragraph("<b>Situation:</b> Rapid hot-reloading on Windows caused builds to fail with <code>MSB3026: Could not copy EShop.Infrastructure.dll because it is being used by another process: EShop.API</code>.", story_body_style),
        Paragraph("<b>Task:</b> Safely terminate locked binaries without corrupting database transactions or halting development.", story_body_style),
        Paragraph("<b>Action:</b> Identified the lingering background worker holding file handles via PowerShell <code>Get-Process</code>, cleanly terminated orphaned PIDs, and configured production release publishing (<code>dotnet publish -c Release -o backend/publish</code>) to isolated directories with <code>.gitignore</code> rules.", story_body_style),
        Paragraph("<b>Result:</b> Completely eliminated binary lock collisions and separated live runtime executions from release builds.", story_body_style),
    ]
    s2_table = Table([[s2_content]], colWidths=[504])
    s2_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(s2_table)
    elements.append(Spacer(1, 10))

    # ── SECTION 4: SYSTEM DESIGN SCENARIOS ────────────────────────────────────
    elements.append(Paragraph("4. System Design & Scalability Scenarios", h1_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=gold_color, spaceBefore=2, spaceAfter=8))

    elements.append(Paragraph("Q: How would you handle 100,000 concurrent users during a Black Friday flash sale?", q_style))
    sd_ans = (
        "<b>1. Edge Caching (CDN):</b> Cache static assets, product images, and category landing pages on Vercel Edge / Cloudflare. The origin API receives zero traffic for read-only pages.<br/>"
        "<b>2. Redis Distributed Cache:</b> Place Redis in front of PostgreSQL for <code>/api/products</code> and <code>/api/categories</code>. Catalog queries respond from memory in &lt; 2ms.<br/>"
        "<b>3. Atomic Stock Decrement:</b> Prevent inventory race conditions with SQL atomic decrements:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<code>UPDATE Products SET Stock = Stock - @qty WHERE Id = @id AND Stock &gt;= @qty;</code><br/>"
        "If rows affected is 0, the item sold out concurrently; abort cleanly without table locking.<br/>"
        "<b>4. Async Order Pipeline:</b> Decouple checkout from fulfillment via message queues (RabbitMQ / Kafka). Return <code>202 Accepted</code> with an order ID in 40ms, while background workers handle notifications and warehouse dispatch."
    )
    elements.append(Paragraph(sd_ans, ans_style))
    elements.append(Spacer(1, 10))

    # ── SECTION 5: TOP 25 HIGH-FREQUENCY QUESTIONS ────────────────────────────
    elements.append(Paragraph("5. Top 25 Technical Interview Questions & Model Answers", h1_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=gold_color, spaceBefore=2, spaceAfter=8))

    qa_list = [
        # Frontend
        ("Q1: What is the difference between Server and Client Components in your app?",
         "Server Components execute exclusively on the server, generating lightweight HTML with 0 kB JavaScript bundle impact. Client Components (<code>'use client'</code>) execute in the browser and are reserved for interactive features like <code>CartDrawer</code>, <code>AuthModal</code>, search debounce, and interactive filters."),
        ("Q2: How does your shopping cart persist across browser refreshes?",
         "Zustand's <code>persist</code> middleware automatically syncs the cart state to <code>localStorage</code>. When a user authenticates, the client synchronizes the local cart with the server via <code>/api/cart</code>, ensuring cart continuity across devices."),
        ("Q3: How do you prevent layout shifts (CLS) when loading luxury product images?",
         "We use Next.js <code>&lt;Image /&gt;</code> with explicit aspect ratios (<code>aspect-[3/4]</code>), placeholder shimmer skeleton cards, and CSS overflow containers so the layout footprint is reserved before the image bytes download."),
        ("Q4: How does error handling work across the frontend?",
         "<code>src/lib/api.ts</code> implements a centralized <code>transformError</code> interceptor that unwraps ASP.NET Core RFC 7807 <code>ProblemDetails</code> or validation arrays into clean toast messages for the user."),
        ("Q5: What is the luxury color harmony system you implemented?",
         "Built on Obsidian Black (<code>#0A0A0A</code>) and Imperial Gold (<code>#C9A84C</code>), elevated with haute horlogerie jewel tones: Emerald Green (Delivered / In-Stock), Ruby Red (Cancelled / Out of Stock / Sale), Sapphire Blue (Shipped / In-Transit), and Topaz Amber (Pending / COD)."),

        # Backend
        ("Q6: What is Clean Architecture and why did you use it?",
         "It enforces separation of concerns: Core has zero dependencies and holds business entities and interfaces; Infrastructure implements database queries and external services; API handles HTTP presentation. This allows swapping databases or adding background workers without touching core domain rules."),
        ("Q7: What is the Unit of Work pattern?",
         "<code>IUnitOfWork</code> aggregates multiple repository calls into a single database context transaction. Calling <code>SaveChangesAsync()</code> executes atomically across all modified entities, guaranteeing all-or-nothing data consistency."),
        ("Q8: Why did you build custom JSON Converters?",
         "Standard <code>System.Text.Json</code> throws 400 Bad Request if an empty string is posted to a <code>Guid?</code> or if an enum string casing doesn't match exactly. Our custom converters normalize these inputs, making the API resilient against real-world client quirks."),
        ("Q9: How does your rate limiting middleware work?",
         "An IP-based rate limiter backed by <code>IMemoryCache</code> tracks request counts per IP. General endpoints allow 100 requests/minute, while sensitive auth endpoints (<code>/api/auth</code>) are throttled to 5 requests/minute to mitigate brute-force attacks."),
        ("Q10: How does your Global Exception Middleware handle errors?",
         "It wraps the HTTP request in a try-catch block, logs stack traces via Serilog, and maps exceptions to standardized RFC 7807 <code>ProblemDetails</code> responses (400 for validation, 401 for unauthorized, 404 for not found, 500 for unhandled) without exposing internal server secrets."),

        # Database & Security
        ("Q11: How do you prevent SQL Injection?",
         "Entity Framework Core uses parameterized SQL queries exclusively. User input is treated strictly as data parameters rather than executable SQL code."),
        ("Q12: How are user passwords secured?",
         "We use <code>BCrypt.Net-Next</code> with automated salt generation. Passwords are never stored in plaintext and cannot be decrypted through rainbow tables."),
        ("Q13: How does your JWT token rotation work?",
         "Short-lived access tokens (15 minutes) are paired with long-lived refresh tokens (7 days). On access token expiry, Axios silently calls <code>/api/auth/refresh</code>, receives a fresh access token, and retries the original request without user interruption."),
        ("Q14: How do you handle database migrations in production?",
         "During startup, <code>Program.cs</code> executes <code>await db.Database.MigrateAsync()</code>, ensuring newly added migration classes apply cleanly without manual SQL scripts."),
        ("Q15: What is idempotent database seeding?",
         "<code>DbInitializer.SeedAsync()</code> checks for record existence before inserting. Server restarts can re-run the seeder repeatedly without creating duplicate categories, products, or admin accounts."),

        # Business Logic & Architecture
        ("Q16: How do you prevent coupon tampering?",
         "The client never decides the discount amount. The backend re-validates the coupon against the database at the instant of order placement, checking expiry, usage count, minimum order value, and percentage caps."),
        ("Q17: Why did you prioritize Cash on Delivery (COD)?",
         "In many high-growth fashion markets, Cash on Delivery accounts for 50-70% of e-commerce checkouts. Supporting reliable COD with ₹0 upfront payment dramatically reduces cart abandonment."),
        ("Q18: How do you generate unique, readable order numbers?",
         "<code>OrderNumberService</code> generates deterministic strings formatted as <code>ORD-YYYYMMDD-XXXXXX</code>, combining the date with a unique uppercase GUID slice."),
        ("Q19: How does the 4-tier address fallback resolver work?",
         "If an order lacks a saved address ID, it falls back to: 1) Inline shipping address, 2) User default saved address, 3) User account profile, preventing order rejections caused by missing address IDs."),
        ("Q20: How does the Admin Order Status workflow operate?",
         "Admins can transition orders through <code>Confirmed ➔ Shipped ➔ Delivered</code> or trigger <code>Cancelled</code>. Status changes trigger live badge updates across the admin table and customer order tracking timelines."),

        # Professional & Practical
        ("Q21: What was your most valuable technical takeaway from this project?",
         "Understanding that enterprise software quality lives at the boundaries: serialization boundaries (JSON converters), network boundaries (CORS, reverse proxy forwarded headers), and transaction boundaries (atomic inventory decrements)."),
        ("Q22: How is the application containerized?",
         "A multi-stage <code>Dockerfile</code> compiles and publishes the .NET 9 API using the full SDK, then copies only the lean binaries to an <code>aspnet:9.0</code> runtime image, keeping image size minimal and secure."),
        ("Q23: How do you monitor container health in cloud hosting?",
         "The ASP.NET Core <code>/health</code> endpoint is mapped in <code>Program.cs</code> and probed by Render/Kubernetes orchestrators to automatically restart unresponsive containers."),
        ("Q24: How does dynamic CORS support preview deployments?",
         "The CORS policy dynamically inspects the request origin: any host ending with <code>.vercel.app</code>, <code>.netlify.app</code>, or <code>.onrender.com</code> is approved on the fly, allowing seamless preview deployments."),
        ("Q25: What is the first enhancement you would build next?",
         "Integrating an asynchronous message broker (RabbitMQ) for background order processing, real-time inventory drop timers with Redis, and transactional email confirmations via Resend.")
    ]

    for q, a in qa_list:
        elements.append(Paragraph(q, q_style))
        elements.append(Paragraph(a, ans_style))
        elements.append(Spacer(1, 4))

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "NEXUS_ECommerce_Interview_Guide.pdf"
    build_pdf(out_file)
