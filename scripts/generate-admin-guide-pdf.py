import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0284C7"))
        self.drawString(45, A4[1] - 30, "LB MATHS TUITION")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(135, A4[1] - 30, "— Admin Portal Step-by-Step Guide")
        
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(45, A4[1] - 36, A4[0] - 45, A4[1] - 36)

        # Footer
        self.line(45, 42, A4[0] - 45, 42)
        self.drawString(45, 30, "Confidential — Internal Operating Guide for Head Tutor")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 45, 30, page_text)
        self.restoreState()

def create_callout(text, bg_color="#FEF3C7", border_color="#D97706", title="NOTE"):
    p_style = ParagraphStyle(
        "Callout",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )
    content = Paragraph(f"<b>{title}:</b> {text}", p_style)
    t = Table([[content]], colWidths=[505])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg_color)),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor(border_color)),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t

def create_table(data, col_widths, primary_color="#0F172A"):
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(primary_color)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t

def build_simplified_pdf(filename="docs/LB_Maths_Tuition_Admin_Usage_Guide.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)

    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=45,
        rightMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    PRIMARY = colors.HexColor("#0F172A")    # Deep Navy
    BRAND_BLUE = colors.HexColor("#0284C7") # Sky Blue
    TEXT_DARK = colors.HexColor("#1E293B")

    styles = getSampleStyleSheet()

    page_title_style = ParagraphStyle(
        "PageTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
        spaceAfter=3
    )
    page_subtitle_style = ParagraphStyle(
        "PageSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=BRAND_BLUE,
        spaceAfter=10
    )
    section_h2 = ParagraphStyle(
        "SecH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=PRIMARY,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_DARK,
        spaceAfter=5
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3.5
    )
    th_style = ParagraphStyle(
        "TH",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white
    )
    td_style = ParagraphStyle(
        "TD",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=TEXT_DARK
    )

    story = []

    # =========================================================================
    # PAGE 1: SYSTEM OVERVIEW & NAVIGATION
    # =========================================================================
    story.append(Paragraph("Page 1: System Overview & Portal Navigation", page_title_style))
    story.append(Paragraph("How the platform is organized and where to find everything as Admin.", page_subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("What is the Platform?", section_h2))
    story.append(Paragraph(
        "The LB Maths Tuition Platform connects tutors and students for online lessons via Microsoft Teams. "
        "Students access a distraction-free lobby to launch their lessons. Tutors manage their timetable and students. "
        "As the <b>Head Tutor (Admin)</b>, you have full access to schedule lessons, set prices, and manage all accounts.",
        body_style
    ))

    story.append(Paragraph("The Three User Roles", section_h2))
    roles_table = [
        [Paragraph("Role", th_style), Paragraph("How They Log In", th_style), Paragraph("What They Can See & Do", th_style)],
        [
            Paragraph("<b>Head Tutor (Admin)</b>", td_style),
            Paragraph("<code>/login</code> with Email + Password", td_style),
            Paragraph("Access to <code>/admin</code>. Can view all students, all tutors, full revenue data, and change all settings.", td_style)
        ],
        [
            Paragraph("<b>Tutor (Staff)</b>", td_style),
            Paragraph("<code>/login</code> with Email + Password", td_style),
            Paragraph("Access to <code>/tutor</code>. Can view only their assigned students, upcoming lessons, and their own pay.", td_style)
        ],
        [
            Paragraph("<b>Student (Tutee)</b>", td_style),
            Paragraph("4-Digit PIN or Magic Link", td_style),
            Paragraph("Access to <code>/student</code> lobby. Shows live countdown, delay alerts, and the Teams join button.", td_style)
        ]
    ]
    story.append(create_table(roles_table, [100, 140, 265]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("The Admin Top Navigation Bar (Tabs)", section_h2))
    story.append(Paragraph(
        "When logged in at <code>https://portal.lbmathstuition.co.uk/admin</code>, you can switch between 6 main tabs at the top of your screen:",
        body_style
    ))
    story.append(Paragraph("• <b>Timetable:</b> View all scheduled, live, and past lessons. Book new lessons or edit existing ones.", bullet_style))
    story.append(Paragraph("• <b>Students:</b> Complete directory of students. Check PIN status, copy Magic Links, or add new students.", bullet_style))
    story.append(Paragraph("• <b>Tutors:</b> View all active tutors, their assigned student counts, and reset tutor passwords.", bullet_style))
    story.append(Paragraph("• <b>Revenue & Analytics:</b> Monthly financial breakdown showing student fees, tutor payroll, and profits.", bullet_style))
    story.append(Paragraph("• <b>Resources:</b> Upload worksheets, links, and past paper revision materials for students.", bullet_style))
    story.append(Paragraph("• <b>Settings & Logs:</b> Download complete database backups and inspect the activity audit trail.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(create_callout(
        "You can quickly check if a student or tutor is currently online via the green indicator dot next to their name anywhere on the dashboard.",
        "#E0F2FE", "#0284C7", "REAL-TIME PRESENCE"
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: TIMETABLE & LESSON SCHEDULING
    # =========================================================================
    story.append(Paragraph("Page 2: Timetable & Lesson Scheduling", page_title_style))
    story.append(Paragraph("How to book lessons, prevent double-bookings, and manage live sessions.", page_subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("How to Schedule a New Lesson", section_h2))
    story.append(Paragraph(
        "1. Click the blue <b>'Schedule Lesson'</b> button at the top of the Timetable tab.<br/>"
        "2. Select the <b>Tutor</b> and the <b>Student</b> from the dropdown menus.<br/>"
        "3. Choose the <b>Date</b>, <b>Start Time</b>, and <b>End Time</b>.<br/>"
        "4. Paste the <b>Microsoft Teams Meeting URL</b> (or leave blank to add it later).<br/>"
        "5. <i>Optional:</i> Tick <b>'Repeat Weekly'</b> and pick the number of weeks (e.g. 4, 8, or 12 weeks) to automatically generate repeating sessions.<br/>"
        "6. Click <b>'Save Lesson'</b>.",
        body_style
    ))

    story.append(Paragraph("Key Scheduling Safeguards", section_h2))
    sched_table = [
        [Paragraph("Safeguard Feature", th_style), Paragraph("How It Works", th_style), Paragraph("Why It Matters", th_style)],
        [
            Paragraph("<b>Conflict Detection</b>", td_style),
            Paragraph("Checks both tutor and student calendars in real-time before saving.", td_style),
            Paragraph("Prevents embarrassing double-bookings or booking over a tutor's holiday.", td_style)
        ],
        [
            Paragraph("<b>5-Minute Link Unlock</b>", td_style),
            Paragraph("Students see the countdown, but the <i>'Join Teams Call'</i> button only unlocks 5 minutes before start.", td_style),
            Paragraph("<b>Safeguarding:</b> Ensures students never wait alone in an unsupervised video call.", td_style)
        ],
        [
            Paragraph("<b>Premature Complete Warning</b>", td_style),
            Paragraph("If you or a tutor click 'Complete Lesson' before start time, a confirmation modal pops up.", td_style),
            Paragraph("Prevents accidentally closing and archiving lessons that haven't happened yet.", td_style)
        ],
        [
            Paragraph("<b>Live Delay Notices</b>", td_style),
            Paragraph("Click <b>'+5m'</b> or <b>'+10m'</b> if running late. An alert immediately pops up on the student's screen.", td_style),
            Paragraph("Stops anxious parents and students wondering why the tutor hasn't joined.", td_style)
        ]
    ]
    story.append(create_table(sched_table, [125, 210, 170]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Rescheduling & Cancelling Lessons", section_h2))
    story.append(Paragraph("• <b>To Reschedule:</b> Click the session card $\\rightarrow$ click <i>'Reschedule'</i> $\\rightarrow$ pick the new date and time.", bullet_style))
    story.append(Paragraph("• <b>To Cancel:</b> Click the session card $\\rightarrow$ click <i>'Cancel Lesson'</i>. You can choose whether to notify the student.", bullet_style))
    story.append(Paragraph("• <b>Student Topic:</b> Students can type what topic they want help with (e.g. <i>'Quadratic equations'</i>) before the lesson. This appears directly on the lesson card for the tutor.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(create_callout(
        "Only the Head Tutor (Admin) can reschedule lessons. Tutors can view their timetable and report completion, but cannot alter scheduled times without admin assistance.",
        "#FEF3C7", "#D97706", "SECURITY RULE"
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: STUDENTS & CREDENTIALS
    # =========================================================================
    story.append(Paragraph("Page 3: Student Roster & Credential Management", page_title_style))
    story.append(Paragraph("Enrolling students, 4-digit PINs, Magic Links, and security lockouts.", page_subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Adding a New Student", section_h2))
    story.append(Paragraph(
        "1. In the <b>Students</b> tab, click the <b>'Add Student'</b> button.<br/>"
        "2. Enter the student's <b>Full Name</b>.<br/>"
        "3. Enter the <b>Parent / Guardian Email</b> and optional phone number.<br/>"
        "4. Choose their default <b>Assigned Tutor</b> from the dropdown.<br/>"
        "5. Enter the billing rates (e.g. Student Pay: £45/hr, Tutor Pay: £25/hr).<br/>"
        "6. Choose a unique <b>4-digit PIN</b> (or leave blank for the system to generate one).<br/>"
        "7. Click <b>'Create Student'</b>.",
        body_style
    ))

    story.append(Paragraph("How Students Log In (PIN vs. Magic Link)", section_h2))
    auth_table = [
        [Paragraph("Login Method", th_style), Paragraph("How the Student Uses It", th_style), Paragraph("Admin Best Practices", th_style)],
        [
            Paragraph("<b>4-Digit PIN</b>", td_style),
            Paragraph("Student goes to <code>portal.lbmathstuition.co.uk</code>, selects their name, and enters their 4-digit PIN.", td_style),
            Paragraph("Best for desktop laptops. PINs are private and easy for students to remember.", td_style)
        ],
        [
            Paragraph("<b>Magic Link</b>", td_style),
            Paragraph("Student clicks a direct link like <code>.../student?key=STU-ALEX-1A2B...</code>. They enter instantly without a PIN.", td_style),
            Paragraph("Best for tablets (iPads) or phones. Send this link to the parent to bookmark on the student's device.", td_style)
        ]
    ]
    story.append(create_table(auth_table, [110, 215, 180]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("PIN Lockouts & How to Unlock Them", section_h2))
    story.append(Paragraph(
        "• <b>Security Lockout:</b> If a student enters the wrong PIN <b>5 consecutive times</b>, their account locks for <b>15 minutes</b> to prevent guessing.<br/>"
        "• <b>How to Unlock:</b> Go to the <i>Students</i> tab $\\rightarrow$ find the student marked with the red <i>'PIN Locked'</i> badge $\\rightarrow$ click <b>'Unlock Account'</b>. The student can now log in immediately without waiting.<br/>"
        "• <b>Cycling Magic Links:</b> If a student loses their device or a magic link is shared accidentally, click <b>'New Magic Link'</b> on their card. The old link becomes invalid instantly.",
        bullet_style
    ))

    story.append(Paragraph("Student Status: Active vs. Inactive (Holidays)", section_h2))
    story.append(Paragraph(
        "When a student takes a term break or pauses lessons, toggle their status to <b>'Inactive'</b>. "
        "Their past lesson notes, ratings, and invoices remain completely safe, but they are hidden from daily scheduling dropdowns so your roster stays tidy.",
        body_style
    ))

    story.append(Spacer(1, 6))
    story.append(create_callout(
        "Student pay rates (what families pay) are strictly confidential and visible ONLY to the Head Tutor. Tutors cannot see student fees.",
        "#DCFCE7", "#16A34A", "PRIVACY GUARANTEE"
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: TUTORS & STAFF ACCESS
    # =========================================================================
    story.append(Paragraph("Page 4: Tutor Management & Staff Access", page_title_style))
    story.append(Paragraph("Adding tutors, setting passwords, and managing tutor availability.", page_subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Adding a New Tutor", section_h2))
    story.append(Paragraph(
        "1. In the <b>Tutors</b> tab, click the <b>'Add Tutor'</b> button.<br/>"
        "2. Enter the tutor's <b>Full Name</b>.<br/>"
        "3. Enter their <b>Email Address</b> (e.g. <code>sarah@lbmathstuition.co.uk</code>).<br/>"
        "4. Set an initial password (minimum 8 characters).<br/>"
        "5. Click <b>'Create Tutor Account'</b>.<br/>"
        "6. The tutor can now log in at <code>portal.lbmathstuition.co.uk/login</code>.",
        body_style
    ))

    story.append(Paragraph("What Tutors Can and Cannot See", section_h2))
    tutor_perm_table = [
        [Paragraph("Feature / Area", th_style), Paragraph("Tutor Access Level", th_style), Paragraph("Notes & Restrictions", th_style)],
        [
            Paragraph("<b>Their Own Students</b>", td_style),
            Paragraph("Full View", td_style),
            Paragraph("Can view lesson history, past lesson notes, and student topic requests.", td_style)
        ],
        [
            Paragraph("<b>Other Tutors' Students</b>", td_style),
            Paragraph("Hidden (Blocked)", td_style),
            Paragraph("Tutors cannot see students assigned to other tutors.", td_style)
        ],
        [
            Paragraph("<b>Tutor Pay Rate</b>", td_style),
            Paragraph("Visible", td_style),
            Paragraph("Shows how much they will earn for their completed lessons.", td_style)
        ],
        [
            Paragraph("<b>Family / Student Fee</b>", td_style),
            Paragraph("Hidden (Blocked)", td_style),
            Paragraph("Tutors never see what the family is charged.", td_style)
        ],
        [
            Paragraph("<b>Lesson Completion</b>", td_style),
            Paragraph("Can Complete & Note", td_style),
            Paragraph("Tutors mark lessons complete and write session summaries.", td_style)
        ]
    ]
    story.append(create_table(tutor_perm_table, [125, 115, 265]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Resetting a Tutor Password", section_h2))
    story.append(Paragraph(
        "• If a tutor forgets their password, go to the <i>Tutors</i> tab and click <b>'Edit / Password'</b> on their card.<br/>"
        "• Enter the new password and click <i>'Update Password'</i>.<br/>"
        "• <b>Automatic Security Log Out:</b> Updating a password automatically revokes all previous login sessions on any phone or laptop the tutor was logged into.",
        bullet_style
    ))

    story.append(Paragraph("Tutor Unavailability & Holiday Blocks", section_h2))
    story.append(Paragraph(
        "Tutors can add their own unavailability directly from their dashboard:<br/>"
        "• <b>Busy Slot (Hourly):</b> e.g. Doctor's appointment on Tuesday 2:00 PM – 3:00 PM.<br/>"
        "• <b>Holiday (Multi-Day):</b> e.g. Summer Holiday from July 10 to July 24.<br/>"
        "Once entered, the admin scheduling tool will automatically block and warn you if you try to book a lesson for that tutor during those times.",
        bullet_style
    ))

    story.append(Spacer(1, 6))
    story.append(create_callout(
        "You can inspect any tutor's weekly timetable by clicking the 'Weekly Calendar' icon on their card in the Tutors tab.",
        "#E0F2FE", "#0284C7", "HELPFUL VIEW"
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: BILLING & REVENUE ANALYTICS
    # =========================================================================
    story.append(Paragraph("Page 5: Billing, Pay Rates & Revenue Analytics", page_title_style))
    story.append(Paragraph("How lesson payments work, historical rates, and downloading financial reports.", page_subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("The Revenue Analytics Hub", section_h2))
    story.append(Paragraph(
        "Click the <b>Revenue & Analytics</b> tab in the Admin Portal to open your business dashboard. "
        "Here you can see exactly how many hours were taught, total client billing, tutor payroll, and your net profit margin.",
        body_style
    ))

    rev_table = [
        [Paragraph("Metric", th_style), Paragraph("Calculation", th_style), Paragraph("Business Purpose", th_style)],
        [
            Paragraph("<b>Total Billed</b>", td_style),
            Paragraph("Sum of all <code>studentPay</code> for completed lessons", td_style),
            Paragraph("Gross tuition turnover collected from families.", td_style)
        ],
        [
            Paragraph("<b>Tutor Payroll</b>", td_style),
            Paragraph("Sum of all <code>tutorPay</code> owed to tutors", td_style),
            Paragraph("Total wages due to tutors for lessons taught.", td_style)
        ],
        [
            Paragraph("<b>Net Margin</b>", td_style),
            Paragraph("<code>Total Billed - Tutor Payroll</code>", td_style),
            Paragraph("Net business profit retained by LB Maths Tuition.", td_style)
        ],
        [
            Paragraph("<b>Hours Taught</b>", td_style),
            Paragraph("Total duration of completed lessons", td_style),
            Paragraph("Helps track workload capacity across terms.", td_style)
        ]
    ]
    story.append(create_table(rev_table, [110, 185, 210]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Historical Rate Snapshots (Important)", section_h2))
    story.append(Paragraph(
        "• <b>What is it?</b> When a lesson is marked complete and archived, the system takes an exact snapshot of the student fee and tutor pay at that exact moment.<br/>"
        "• <b>Why is this vital?</b> If you increase a student's rate from £40 to £45 in September, your past lessons from June and July remain permanently locked at £40. Past payroll and accounts are never altered by future rate changes.",
        bullet_style
    ))

    story.append(Paragraph("Billing Duration Modes", section_h2))
    story.append(Paragraph(
        "Under the <i>Settings</i> tab, you can choose how pay is calculated for odd lesson lengths:<br/>"
        "• <b>Proportional (Default):</b> Pay is calculated strictly by minutes (e.g. 45 min lesson at £40/hr = £30.00).<br/>"
        "• <b>Round to Nearest Hour:</b> Rounds up/down to whole hours.",
        bullet_style
    ))

    story.append(Paragraph("Exporting to Excel / CSV", section_h2))
    story.append(Paragraph(
        "At the end of each month, click the blue <b>'Export to CSV'</b> button at the top of the Timetable or Analytics tab. "
        "This downloads a clean spreadsheet listing every lesson date, student, tutor, duration, fee, and tutor pay for simple accounting.",
        body_style
    ))

    story.append(Spacer(1, 6))
    story.append(create_callout(
        "You can mark tutor wages as paid by ticking 'Tutor Settled' on lessons. This helps you track which lessons have already been paid out to staff.",
        "#FEF3C7", "#D97706", "PAYROLL TRACKING"
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: RESOURCES, TOOLS & BACKUPS
    # =========================================================================
    story.append(Paragraph("Page 6: Resources, Classroom Tools & Backups", page_title_style))
    story.append(Paragraph("Built-in calculator, formula sheets, audit logs, and data backups.", page_subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Built-in Classroom Tools", section_h2))
    tools_table = [
        [Paragraph("Tool", th_style), Paragraph("Where to Find It", th_style), Paragraph("How It Helps During Lessons", th_style)],
        [
            Paragraph("<b>Casio fx-83GT X ClassWiz</b>", td_style),
            Paragraph("Calculator icon in top navbar", td_style),
            Paragraph("Virtual scientific calculator with exact math engine (fractions, exact π, surds). Students and tutors can pop this up directly on screen.", td_style)
        ],
        [
            Paragraph("<b>Formula Sheet Hub</b>", td_style),
            Paragraph("Formula icon in top navbar", td_style),
            Paragraph("Instant reference to official GCSE (Edexcel, AQA) and A-Level (Edexcel, AQA, OCR) exam booklets and formula sheets.", td_style)
        ],
        [
            Paragraph("<b>Exam Countdown Widget</b>", td_style),
            Paragraph("Timer icon on student lobby", td_style),
            Paragraph("Displays exact countdowns to upcoming GCSE and A-Level maths exam papers to keep students motivated.", td_style)
        ],
        [
            Paragraph("<b>Shared Resources</b>", td_style),
            Paragraph("Resources tab in navbar", td_style),
            Paragraph("Upload and tag revision links, practice worksheets, and YouTube video tutorials organized by topic (Algebra, Geometry, etc.).", td_style)
        ]
    ]
    story.append(create_table(tools_table, [120, 125, 260]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Audit Logs (Activity Tracking)", section_h2))
    story.append(Paragraph(
        "Under the <b>Settings & Logs</b> tab, click <b>'Activity Logs'</b>. This displays a tamper-proof timestamped audit trail of:<br/>"
        "• Who scheduled or rescheduled a lesson.<br/>"
        "• Who posted delay alerts (+5m / +10m).<br/>"
        "• When attendance was confirmed by tutor and student.<br/>"
        "• Any cancellations or edits to lesson notes.",
        bullet_style
    ))

    story.append(Paragraph("How to Download a Complete Database Backup", section_h2))
    story.append(Paragraph(
        "1. Go to the <b>Settings</b> tab in the Admin Portal.<br/>"
        "2. Locate the <b>Database Backup</b> card and click <b>'Download System Backup (.json)'</b>.<br/>"
        "3. The system generates an encrypted snapshot containing all users, lessons, settings, and shared resources.<br/>"
        "4. <i>Security Feature:</i> All tutor password hashes are automatically scrubbed from backup files for safety.<br/>"
        "5. Save this backup file once a month onto a secure backup drive.",
        body_style
    ))

    story.append(Spacer(1, 6))
    story.append(create_callout(
        "Platform URL: https://portal.lbmathstuition.co.uk | Server Host: Deno Deploy Edge Cloud | Database: Turso libSQL | For technical support, contact Luke.",
        "#F1F5F9", "#64748B", "SYSTEM SUMMARY"
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated page-by-page guide: {filename}")

if __name__ == "__main__":
    out_path = "docs/LB_Maths_Tuition_Admin_Usage_Guide.pdf"
    if len(sys.argv) > 1:
        out_path = sys.argv[1]
    build_simplified_pdf(out_path)
