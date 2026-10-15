import os
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
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
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, A4[1] - 36, "LB Maths Tuition Platform — Admin Usage & Operations Guide")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, A4[1] - 42, A4[0] - 54, A4[1] - 42)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 45, A4[0] - 54, 45)
        
        self.drawString(54, 32, "Confidential — For Head Tutor / System Administrator Use Only")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 54, 32, page_text)
        self.restoreState()

def build_pdf(filename="docs/LB_Maths_Tuition_Admin_Usage_Guide.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    PRIMARY = colors.HexColor("#0F172A")    # Slate 900
    BRAND_BLUE = colors.HexColor("#0284C7") # Sky 600
    TEXT_DARK = colors.HexColor("#1E293B")  # Slate 800
    TEXT_MUTED = colors.HexColor("#64748B") # Slate 500
    BG_LIGHT = colors.HexColor("#F8FAFC")   # Slate 50
    CARD_BORDER = colors.HexColor("#CBD5E1")# Slate 300
    ACCENT_AMBER = colors.HexColor("#D97706")

    # Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=BRAND_BLUE,
        spaceAfter=15
    )
    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=BRAND_BLUE,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        spaceAfter=6
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=body_style,
        fontName="Helvetica-Bold"
    )
    bullet_style = ParagraphStyle(
        "BulletItem",
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )
    callout_style = ParagraphStyle(
        "CalloutText",
        parent=body_style,
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=TEXT_DARK
    )
    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    story = []

    # Title Block
    story.append(Paragraph("LB Maths Tuition Platform", title_style))
    story.append(Paragraph("Administrator & Head Tutor Operating Manual", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BRAND_BLUE, spaceBefore=0, spaceAfter=14))

    # Executive Overview
    story.append(Paragraph("1. Executive Overview & Purpose", h1_style))
    story.append(Paragraph(
        "The LB Maths Tuition Platform (TutorHub) is a centralized student portal and administrative engine designed "
        "to schedule, deliver, and track online mathematics tutoring sessions conducted via Microsoft Teams. "
        "As an Administrator (Head Tutor), you possess full operational control over student enrollments, tutor rosters, "
        "lesson timetables, conflict resolution, payment tracking, and global security policies.",
        body_style
    ))

    # Core Navigation Table
    nav_data = [
        [Paragraph("Portal Area", table_header), Paragraph("URL Route", table_header), Paragraph("Key Operational Duties", table_header)],
        [
            Paragraph("<b>Admin Portal</b>", table_cell),
            Paragraph("<code>/admin</code>", table_cell),
            Paragraph("Master dashboard: scheduling, rosters, revenue analytics, audit logs, and settings.", table_cell)
        ],
        [
            Paragraph("<b>Tutor Dashboard</b>", table_cell),
            Paragraph("<code>/tutor</code>", table_cell),
            Paragraph("Tutor view: assigned student roster, upcoming sessions, delay alerts (+5m/+10m), session notes.", table_cell)
        ],
        [
            Paragraph("<b>Student Lobby</b>", table_cell),
            Paragraph("<code>/</code> or <code>/student</code>", table_cell),
            Paragraph("Student entry: 4-digit PIN / Magic Link login, live lesson countdown, Teams join button.", table_cell)
        ]
    ]
    t = Table(nav_data, colWidths=[100, 95, 295])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Section 2: Lesson Scheduling & Operations
    story.append(Paragraph("2. Lesson Scheduling & Timetable Controls", h1_style))
    story.append(Paragraph("<b>2.1 Creating Lessons & Conflict Detection</b>", h2_style))
    story.append(Paragraph(
        "• Click <b>'Schedule Lesson'</b> in the Timetable tab. Select the tutor, student, date, and times.<br/>"
        "• <b>Automated Conflict Detector:</b> The engine automatically cross-checks both tutor and student schedules. "
        "If a double-booking or unavailability overlap exists, the system warns the admin before saving.<br/>"
        "• <b>Recurring Bookings:</b> Check <i>'Repeat Weekly'</i> to schedule up to 12 weeks of repeating sessions in a single click.",
        bullet_style
    ))

    story.append(Paragraph("<b>2.2 Teams Meeting Link & Safeguarding Lock</b>", h2_style))
    story.append(Paragraph(
        "• <b>Teams URL Validation:</b> The platform strictly validates Microsoft Teams meeting links to ensure students are directed to legitimate calls.<br/>"
        "• <b>Early Entry Safeguard (5-Minute Window):</b> Students can enter the lobby 10 minutes beforehand, but the <i>'Join Teams Call'</i> button is locked until <b>5 minutes before</b> start time. This prevents students from lingering unsupervised in meeting rooms.<br/>"
        "• <b>Live Delay Broadcasts:</b> If running behind, tutors or admins can post a <b>+5 min</b> or <b>+10 min</b> delay alert with an optional reason. The student's lobby updates instantly via Server-Sent Events (SSE) with sound cues.",
        bullet_style
    ))

    # Callout Box
    alert_box = [
        [Paragraph(
            "<b>Safeguarding Policy Notice:</b> Never share meeting links externally. All student sessions must have an assigned tutor. "
            "If a lesson must be completed before its scheduled start time, the admin panel requires explicit confirmation to prevent accidental records.",
            callout_style
        )]
    ]
    tb_alert = Table(alert_box, colWidths=[490])
    tb_alert.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
        ("BOX", (0, 0), (-1, -1), 1, ACCENT_AMBER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(tb_alert)
    story.append(Spacer(1, 10))

    # Section 3: Student & Tutor Management
    story.append(Paragraph("3. Student Roster & Credential Management", h1_style))
    story.append(Paragraph(
        "• <b>Enrolling Students:</b> Navigate to the <i>Students</i> tab and click <i>'Add Student'</i>. Assign their normal tutor, optional parent contact email/phone, and billing rates.<br/>"
        "• <b>4-Digit Student PINs:</b> Students authenticate by selecting their profile and entering their 4-digit PIN. The system enforces strict dual-tier rate limiting: <b>5 incorrect attempts triggers a 15-minute security lockout</b>. Admins can unlock locked accounts instantly via the <i>'Unlock PIN'</i> button.<br/>"
        "• <b>Secure Magic Links:</b> Each student has a unique magic link (e.g., <code>https://portal.lbmathstuition.co.uk/student?key=STU-NAME-HEX</code>) for one-click passwordless access on tablets or phones. Click <i>'Cycle Magic Link'</i> to regenerate this key if compromised.<br/>"
        "• <b>Student Inactivity (Breaks/Holidays):</b> Toggle a student to <i>'Inactive'</i> when they take a term break. Their historical records remain preserved, but they are filtered out of active scheduling lists.",
        bullet_style
    ))

    story.append(Paragraph("4. Tutor Management & Staff Access", h1_style))
    story.append(Paragraph(
        "• <b>Tutor Accounts:</b> Tutors log in at <code>/login</code> using their registered email and a secure password (minimum 8 characters, hashed with bcrypt).<br/>"
        "• <b>Password Resets & Token Invalidation:</b> Updating a tutor's password in the Admin tab automatically increments their <code>tokenVersion</code>, instantly terminating any active sessions on lost or unauthorized devices.<br/>"
        "• <b>Unavailability Records:</b> Tutors can mark <i>'Busy'</i> hours or <i>'Holiday'</i> date ranges in their calendar, preventing admins from scheduling lessons during those periods.",
        bullet_style
    ))

    story.append(PageBreak())

    # Section 5: Billing & Analytics
    story.append(Paragraph("5. Rates, Billing & Revenue Analytics", h1_style))
    story.append(Paragraph(
        "The platform includes a dedicated <b>Revenue Analytics Hub</b> in the Admin Portal for tracking tuition turnover, tutor payroll, and profit margins.",
        body_style
    ))

    billing_table_data = [
        [Paragraph("Feature", table_header), Paragraph("Mechanism", table_header), Paragraph("Operational Impact", table_header)],
        [
            Paragraph("<b>Student Fee</b>", table_cell),
            Paragraph("<code>studentPay</code> (per hour)", table_cell),
            Paragraph("Strictly confidential to Head Tutor. Tutors and students can never view this field.", table_cell)
        ],
        [
            Paragraph("<b>Tutor Pay</b>", table_cell),
            Paragraph("<code>tutorPay</code> (per hour)", table_cell),
            Paragraph("Visible to the assigned tutor on their dashboard for their own sessions only.", table_cell)
        ],
        [
            Paragraph("<b>Historical Rate Snapshots</b>", table_cell),
            Paragraph("Immutable Archival", table_cell),
            Paragraph("When a lesson completes or archives, its fee and payout are locked. Future rate changes never alter past financial history.", table_cell)
        ],
        [
            Paragraph("<b>Billing Duration Mode</b>", table_cell),
            Paragraph("Proportional vs. Round to Hour", table_cell),
            Paragraph("Configured in Settings: calculate pay based on exact minutes taught or round to nearest whole hour.", table_cell)
        ],
        [
            Paragraph("<b>CSV Exports</b>", table_cell),
            Paragraph("One-Click Export", table_cell),
            Paragraph("Export filtered lessons, dates, and payout figures into Excel/CSV for accounting and payroll.", table_cell)
        ]
    ]
    t_bill = Table(billing_table_data, colWidths=[105, 125, 260])
    t_bill.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t_bill)
    story.append(Spacer(1, 10))

    # Section 6: Built-in Tools & Learning Resources
    story.append(Paragraph("6. Built-in Classroom Tools & Accessibility", h1_style))
    story.append(Paragraph(
        "• <b>Virtual Casio fx-83GT X ClassWiz Calculator:</b> Full-fidelity scientific calculator with Natural V.P.A.M. exact math engine (fractions, exact π, surds). Students and tutors can pop this up directly inside the app.<br/>"
        "• <b>Formula Sheet Hub:</b> Integrated GCSE (Edexcel, AQA) and A-Level (Edexcel, AQA, OCR) exam aids and formula sheets accessible with one click.<br/>"
        "• <b>Shared Resources Hub:</b> Admin can upload and tag worksheets, past paper links, and video resources filtered by topic (Algebra, Geometry, Calculus, Statistics).<br/>"
        "• <b>Sensory & Accessibility Preferences:</b> Includes high-contrast toggle, OpenDyslexic font support, reduced motion, and audio cue toggles.",
        bullet_style
    ))

    # Section 7: Audit Logs, Backups & Maintenance
    story.append(Paragraph("7. Audit Logs & System Backups", h1_style))
    story.append(Paragraph(
        "• <b>Full Audit Trail:</b> Every lesson creation, cancellation, reschedule, and rating edit is recorded with the actor ID and timestamp under the <i>Activity Logs</i> tab.<br/>"
        "• <b>Encrypted Database Backups:</b> In the <i>Settings</i> tab, admins can trigger a complete JSON backup export of all system tables (users, sessions, settings, resources). All sensitive password hashes are automatically scrubbed from backup files.<br/>"
        "• <b>Server Synchronization (SSE):</b> All timetable changes, delay notices, and online presence indicators synchronize live across all connected devices without manual page refreshing.",
        bullet_style
    ))

    # Support / Summary Box
    summary_box = [
        [Paragraph(
            "<b>Support & Maintenance:</b><br/>"
            "• Production Domain: <code>https://portal.lbmathstuition.co.uk</code><br/>"
            "• Edge Host: Deno Deploy (with LibSQL edge SQLite database on Turso)<br/>"
            "• Technical Issues: Contact Platform Administrator (Luke) or reference internal platform docs in <code>/docs</code>.",
            callout_style
        )]
    ]
    tb_summary = Table(summary_box, colWidths=[490])
    tb_summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(Spacer(1, 10))
    story.append(tb_summary)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {filename}")

if __name__ == "__main__":
    out_path = "docs/LB_Maths_Tuition_Admin_Usage_Guide.pdf"
    if len(sys.argv) > 1:
        out_path = sys.argv[1]
    build_pdf(out_path)
