import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class WordStyleNumberedCanvas(canvas.Canvas):
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
        # Word-like header
        self.setFont("Helvetica", 8.5)
        self.setFillColor(colors.HexColor("#595959"))
        self.drawString(50, A4[1] - 32, "LB Maths Tuition — Admin Dashboard Guide")
        self.setStrokeColor(colors.HexColor("#D0D5DD"))
        self.setLineWidth(0.5)
        self.line(50, A4[1] - 36, A4[0] - 50, A4[1] - 36)

        # Word-like footer
        self.line(50, 42, A4[0] - 50, 42)
        self.drawString(50, 30, "Internal staff guide for the Head Tutor")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 50, 30, page_text)
        self.restoreState()

def make_tip_box(title, text, bg="#F0F4F8", border="#2B579A"):
    p_style = ParagraphStyle(
        "TipText",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#262626")
    )
    content = Paragraph(f"<b>Tip: {title}</b><br/>{text}", p_style)
    t = Table([[content]], colWidths=[495])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor(border)),
        ("LINELEFT", (0, 0), (-1, -1), 3.5, colors.HexColor(border)),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t

def make_clean_table(data, col_widths):
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2B579A")), # Microsoft Word classic dark blue
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t

def build_word_style_pdf(filename="docs/LB_Maths_Tuition_Admin_Usage_Guide.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)

    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=50,
        rightMargin=50,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    TITLE_COLOR = colors.HexColor("#1B365D")   # Word Dark Blue Heading
    SUBTITLE_COLOR = colors.HexColor("#2E75B6")# Word Subhead Blue
    TEXT_COLOR = colors.HexColor("#262626")    # Word Body Text

    title_style = ParagraphStyle(
        "PageTitle",
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=TITLE_COLOR,
        spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        "PageSubtitle",
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=SUBTITLE_COLOR,
        spaceAfter=8
    )
    h2_style = ParagraphStyle(
        "Head2",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=TITLE_COLOR,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_COLOR,
        spaceAfter=5
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )
    num_style = ParagraphStyle(
        "NumberedStep",
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )
    th_style = ParagraphStyle(
        "TH",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=colors.white
    )
    td_style = ParagraphStyle(
        "TD",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=TEXT_COLOR
    )

    story = []

    # =========================================================================
    # PAGE 1: GETTING STARTED & WHAT EVERYTHING IS
    # =========================================================================
    story.append(Paragraph("Page 1: Getting Started & The Menu Tabs", title_style))
    story.append(Paragraph("A quick overview of what the website does and where to find things.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Welcome to the Admin Dashboard", h2_style))
    story.append(Paragraph(
        "This platform is where we run LB Maths Tuition lessons online. It connects tutors and students via Microsoft Teams, "
        "keeps track of student PINs, prevents double-booking lessons, and calculates tutor wages and business profits. "
        "As the <b>Head Tutor (Admin)</b>, you have full control over everything on the site.",
        body_style
    ))

    story.append(Paragraph("How the 3 User Logins Work", h2_style))
    users_data = [
        [Paragraph("Who", th_style), Paragraph("Where they go", th_style), Paragraph("What they can do", th_style)],
        [
            Paragraph("<b>Head Tutor (You)</b>", td_style),
            Paragraph("<code>.../login</code> &rarr; <code>/admin</code>", td_style),
            Paragraph("Full master access. You can book lessons, view all student fees, change tutor wages, and edit any details.", td_style)
        ],
        [
            Paragraph("<b>Tutors (Staff)</b>", td_style),
            Paragraph("<code>.../login</code> &rarr; <code>/tutor</code>", td_style),
            Paragraph("Only see their own assigned students, their upcoming lessons, and how much they are owed for teaching.", td_style)
        ],
        [
            Paragraph("<b>Students</b>", td_style),
            Paragraph("<code>portal.lbmathstuition.co.uk</code>", td_style),
            Paragraph("Log in with a 4-digit PIN or a direct Magic Link. They see a countdown to their lesson and the button to join Teams.", td_style)
        ]
    ]
    story.append(make_clean_table(users_data, [95, 140, 260]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("What Each Tab Does (Top of the Screen)", h2_style))
    story.append(Paragraph("When logged in as Admin, you have 6 tabs along the top bar:", body_style))
    story.append(Paragraph("• <b>Timetable:</b> Your main home screen. Shows upcoming lessons, live lessons, and past lessons. This is where you book new sessions.", bullet_style))
    story.append(Paragraph("• <b>Students:</b> Your student directory. Check student PINs, send Magic Links to parents, or add new students.", bullet_style))
    story.append(Paragraph("• <b>Tutors:</b> Your staff list. Check which students each tutor teaches, and reset tutor passwords if they forget them.", bullet_style))
    story.append(Paragraph("• <b>Revenue & Analytics:</b> Your money tab. Shows monthly totals: how much students were charged, tutor payroll, and profit.", bullet_style))
    story.append(Paragraph("• <b>Resources:</b> Upload worksheets, links, or revision notes so students can download them.", bullet_style))
    story.append(Paragraph("• <b>Settings & Logs:</b> Download complete database backups or see the history log of who booked or changed lessons.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(make_tip_box(
        "Green online indicator",
        "If a student or tutor is currently on the website with their browser open, you'll see a small green dot next to their name. If they close their tab, it turns gray within a minute."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: BOOKING & MANAGING LESSONS
    # =========================================================================
    story.append(Paragraph("Page 2: Booking & Managing Lessons", title_style))
    story.append(Paragraph("How to book lessons, repeat bookings, paste Teams links, and handle delays.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Step-by-Step: How to Book a Lesson", h2_style))
    story.append(Paragraph("1. Click the blue <b>'Schedule Lesson'</b> button on the Timetable tab.", num_style))
    story.append(Paragraph("2. Pick the <b>Tutor</b> and the <b>Student</b> from the dropdown lists.", num_style))
    story.append(Paragraph("3. Choose the <b>Date</b>, <b>Start Time</b>, and <b>End Time</b> (e.g. 10:00 to 11:00).", num_style))
    story.append(Paragraph("4. Paste the <b>Microsoft Teams Meeting link</b> into the box.", num_style))
    story.append(Paragraph("5. <i>Want it to repeat?</i> Tick <b>'Repeat Weekly'</b> and choose how many weeks (e.g. 4, 8, or 12 weeks). The site will create all the bookings automatically.", num_style))
    story.append(Paragraph("6. Click <b>'Save Lesson'</b>.", num_style))

    story.append(Paragraph("Important Features You Should Know", h2_style))
    lesson_features = [
        [Paragraph("Feature", th_style), Paragraph("How it works in practice", th_style)],
        [
            Paragraph("<b>Automatic Double-Booking Check</b>", td_style),
            Paragraph("If you accidentally try to book a lesson when the tutor or student is already busy (or if the tutor booked a holiday), the site will pop up a red warning so you don't clash.", td_style)
        ],
        [
            Paragraph("<b>The 5-Minute Safety Rule</b>", td_style),
            Paragraph("Students can open the website early to see the countdown, but the <i>'Join Teams Call'</i> button will only turn blue and clickable <b>5 minutes before the lesson starts</b>. This stops children waiting alone in video calls before a tutor arrives.", td_style)
        ],
        [
            Paragraph("<b>Tutor Delay Buttons (+5m / +10m)</b>", td_style),
            Paragraph("If a tutor is running a few minutes late, they can click <b>+5m</b> or <b>+10m</b> on their dashboard. A friendly yellow alert immediately pops up on the student's screen with a gentle sound chime, so families know they haven't been forgotten.", td_style)
        ],
        [
            Paragraph("<b>Student Topics</b>", td_style),
            Paragraph("Before a lesson starts, a student can type what they need help with (for example: <i>'Simultaneous equations'</i>). This appears directly on the tutor's lesson card so they can prepare.", td_style)
        ]
    ]
    story.append(make_clean_table(lesson_features, [145, 350]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("How to Reschedule or Cancel a Lesson", h2_style))
    story.append(Paragraph("• <b>To change the date or time:</b> Click on the lesson card, click <i>'Reschedule'</i>, pick the new time, and save. Only you (the Admin) can reschedule lessons.", bullet_style))
    story.append(Paragraph("• <b>To cancel:</b> Click the lesson card, click <i>'Cancel Lesson'</i>. You can choose whether to notify the family.", bullet_style))
    story.append(Paragraph("• <b>Accidental completion check:</b> If you click 'Complete' on a lesson that hasn't started yet, you will see a warning asking if you are sure. This stops people accidentally closing future lessons.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(make_tip_box(
        "Teams links save automatically",
        "If you use the same Teams link for all a tutor's lessons, the site remembers the last link used for that student so you don't have to keep hunting for the link every single week."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: STUDENTS & PASSWORDS
    # =========================================================================
    story.append(Paragraph("Page 3: Adding Students, PINs & Magic Links", title_style))
    story.append(Paragraph("How students get into their lessons, fixing locked PINs, and term breaks.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("How to Add a New Student", h2_style))
    story.append(Paragraph("1. Go to the <b>Students</b> tab and click <b>'Add Student'</b>.", num_style))
    story.append(Paragraph("2. Type the student's <b>Full Name</b>.", num_style))
    story.append(Paragraph("3. Add the <b>Parent Email</b> (and optional mobile number).", num_style))
    story.append(Paragraph("4. Pick their default <b>Assigned Tutor</b>.", num_style))
    story.append(Paragraph("5. Enter their hourly price (e.g. Student fee: £45/hr, Tutor pay: £25/hr).", num_style))
    story.append(Paragraph("6. Type a simple <b>4-digit PIN</b> (like 1234 or 4582) or leave it blank to auto-create one.", num_style))
    story.append(Paragraph("7. Click <b>'Create Student'</b>.", num_style))

    story.append(Paragraph("The Two Ways Students Can Log In", h2_style))
    login_table = [
        [Paragraph("Login Method", th_style), Paragraph("How it works", th_style), Paragraph("When to use it", th_style)],
        [
            Paragraph("<b>4-Digit PIN</b>", td_style),
            Paragraph("The student opens <code>portal.lbmathstuition.co.uk</code>, clicks their name, and types their 4 numbers.", td_style),
            Paragraph("Best for laptops and computers. Easy for students to remember.", td_style)
        ],
        [
            Paragraph("<b>Magic Link</b>", td_style),
            Paragraph("A direct private link like <code>.../student?key=STU-ALEX-8F92...</code>. Clicking it logs the student in without typing anything.", td_style),
            Paragraph("Best for iPads and tablets. Send this link to the parent so they can bookmark it on the child's home screen.", td_style)
        ]
    ]
    story.append(make_clean_table(login_table, [95, 240, 160]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("What to Do If a Student Gets Locked Out", h2_style))
    story.append(Paragraph(
        "To stop people guessing PINs, if a student enters the wrong numbers <b>5 times in a row</b>, their account locks for 15 minutes.<br/>"
        "• <b>How to unlock them immediately:</b> Open the <i>Students</i> tab. You will see a red <i>'PIN Locked'</i> badge next to their name. Simply click the <b>'Unlock Account'</b> button, and they can try again right away.<br/>"
        "• <b>Resetting a compromised Magic Link:</b> If a link gets shared with someone else, click <b>'New Magic Link'</b> on the student's card. This turns off the old link instantly and creates a fresh one.",
        body_style
    ))

    story.append(Paragraph("Students Taking a Break (Holidays / Term Breaks)", h2_style))
    story.append(Paragraph(
        "If a student stops lessons for the summer, click <i>'Edit'</i> and toggle them to <b>Inactive</b>. "
        "This hides them from your daily lesson booking lists so your screen stays tidy, but all their past lesson notes, ratings, and payment history remain completely safe.",
        body_style
    ))

    story.append(Spacer(1, 6))
    story.append(make_tip_box(
        "Student fees are private",
        "Tutors can never see what parents are charged. Only you (the Head Tutor) can see the family fee. Tutors only ever see their own agreed hourly pay."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: TUTORS & STAFF HOURS
    # =========================================================================
    story.append(Paragraph("Page 4: Managing Tutors & Staff Availability", title_style))
    story.append(Paragraph("Adding tutors, resetting passwords, and managing when tutors can teach.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("How to Add a New Tutor", h2_style))
    story.append(Paragraph("1. Open the <b>Tutors</b> tab and click <b>'Add Tutor'</b>.", num_style))
    story.append(Paragraph("2. Type their <b>Full Name</b>.", num_style))
    story.append(Paragraph("3. Enter their work email (e.g. <code>dan@lbmathstuition.co.uk</code>).", num_style))
    story.append(Paragraph("4. Type a temporary password (at least 8 characters).", num_style))
    story.append(Paragraph("5. Click <b>'Create Tutor Account'</b> and send them their login details.", num_style))

    story.append(Paragraph("What Tutors Can See When They Log In", h2_style))
    tutor_rules = [
        [Paragraph("Screen / Feature", th_style), Paragraph("What the tutor sees", th_style)],
        [
            Paragraph("<b>Their Students</b>", td_style),
            Paragraph("They only see the students assigned to them. They cannot see other tutors' students.", td_style)
        ],
        [
            Paragraph("<b>Their Pay</b>", td_style),
            Paragraph("They can see how much they will earn per hour for their lessons, and their monthly earnings total.", td_style)
        ],
        [
            Paragraph("<b>Lesson Completion</b>", td_style),
            Paragraph("At the end of a lesson, tutors click <i>'Complete Lesson'</i> and write a short summary of what was covered. Both you and the student can read these notes.", td_style)
        ],
        [
            Paragraph("<b>Meeting Links</b>", td_style),
            Paragraph("Tutors can update their own Teams meeting links if needed.", td_style)
        ]
    ]
    story.append(make_clean_table(tutor_rules, [130, 365]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("What to Do If a Tutor Forgets Their Password", h2_style))
    story.append(Paragraph(
        "1. Open the <b>Tutors</b> tab.<br/>"
        "2. Click the <b>'Edit / Password'</b> button on that tutor's card.<br/>"
        "3. Type a new password and save.<br/>"
        "• <i>Security feature:</i> As soon as you save the new password, the site automatically logs that tutor out of any old phones or laptops they were signed into.",
        body_style
    ))

    story.append(Paragraph("Tutor Holidays & Busy Times", h2_style))
    story.append(Paragraph(
        "Tutors can block out times they cannot teach directly from their dashboard:<br/>"
        "• <b>Busy Slot:</b> For appointments during the day (e.g. Tuesday 2:00 PM – 3:30 PM).<br/>"
        "• <b>Holiday:</b> For longer breaks (e.g. Away from August 5 to August 19).<br/>"
        "Once a tutor adds a busy slot, the scheduling screen will warn you if you try to book a lesson with them during that time.",
        body_style
    ))

    story.append(Spacer(1, 6))
    story.append(make_tip_box(
        "Viewing a tutor's week at a glance",
        "Click the calendar icon on any tutor's card to open their weekly timetable grid. This lets you see all their booked lessons and free gaps in one visual view."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: MONEY & REPORTS
    # =========================================================================
    story.append(Paragraph("Page 5: Money, Rates & Monthly Reports", title_style))
    story.append(Paragraph("How lesson pricing works, checking monthly profit, and downloading spreadsheets.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("The Revenue & Analytics Dashboard", h2_style))
    story.append(Paragraph(
        "Click the <b>Revenue & Analytics</b> tab to see how the business is doing. "
        "You can pick any month (e.g. October 2026) or custom date range to see four clear numbers:",
        body_style
    ))

    money_cards = [
        [Paragraph("Dashboard Number", th_style), Paragraph("What it tells you", th_style)],
        [
            Paragraph("<b>Total Billed</b>", td_style),
            Paragraph("The total amount of lesson fees charged to families for lessons taught this month.", td_style)
        ],
        [
            Paragraph("<b>Tutor Payroll</b>", td_style),
            Paragraph("The total wages owed to tutors for teaching those lessons.", td_style)
        ],
        [
            Paragraph("<b>Net Margin (Profit)</b>", td_style),
            Paragraph("The money left over for LB Maths Tuition after tutor pay is taken off (<code>Total Billed minus Tutor Payroll</code>).", td_style)
        ],
        [
            Paragraph("<b>Hours Taught</b>", td_style),
            Paragraph("The total teaching hours delivered across all tutors this month.", td_style)
        ]
    ]
    story.append(make_clean_table(money_cards, [140, 355]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("How Lesson Prices Work (Important Rule)", h2_style))
    story.append(Paragraph(
        "When you schedule a student, you set their hourly price (e.g. £45) and the tutor's pay (e.g. £25).<br/>"
        "• <b>Prices lock when completed:</b> When a lesson finishes, the system permanently locks that lesson at £45 and £25.<br/>"
        "• <b>Why this is great:</b> If you increase a student's rate in October to £50, their past lessons from May and June will <b>never change</b>. Your past accounting records and tax numbers will always stay 100% accurate.",
        body_style
    ))

    story.append(Paragraph("How to Download a Spreadsheet (Excel / CSV)", h2_style))
    story.append(Paragraph(
        "At the end of each month, click the blue <b>'Export to CSV'</b> button at the top of the screen. "
        "This downloads an Excel-friendly spreadsheet listing every lesson date, student name, tutor name, how long the lesson lasted, what was charged, and what the tutor earned.",
        body_style
    ))

    story.append(Paragraph("Tracking Which Tutors Have Been Paid", h2_style))
    story.append(Paragraph(
        "Once you do your monthly bank transfers to tutors, you can tick <b>'Tutor Settled'</b> on their lessons. "
        "This helps you keep track of which lessons have already been paid out and which ones are still waiting for payroll.",
        body_style
    ))

    story.append(Spacer(1, 6))
    story.append(make_tip_box(
        "Half-hour or 45-minute lessons",
        "By default, lesson pay is calculated proportionally to the exact minute. For example, a 45-minute lesson at £40/hr calculates accurately as £30.00."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: EXTRA TOOLS, LOGS & BACKUPS
    # =========================================================================
    story.append(Paragraph("Page 6: Extra Tools, Activity Logs & Backups", title_style))
    story.append(Paragraph("Built-in calculator, exam formula sheets, checking history, and downloading backups.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Built-in Tools for Students & Tutors", h2_style))
    story.append(Paragraph(
        "You and your students don't need to leave the website during lessons because the classroom tools are built right in:",
        body_style
    ))

    tools_list = [
        [Paragraph("Tool", th_style), Paragraph("Where it is", th_style), Paragraph("How it works", th_style)],
        [
            Paragraph("<b>Casio fx-83GT X ClassWiz</b>", td_style),
            Paragraph("Calculator icon in top bar", td_style),
            Paragraph("A complete virtual scientific calculator on screen. Works just like the real exam calculator with exact fractions, square roots, and π.", td_style)
        ],
        [
            Paragraph("<b>Formula Sheet Hub</b>", td_style),
            Paragraph("Formula icon in top bar", td_style),
            Paragraph("Instant pop-up of official exam formula sheets for GCSE (Edexcel & AQA) and A-Level (Edexcel, AQA & OCR).", td_style)
        ],
        [
            Paragraph("<b>Exam Countdowns</b>", td_style),
            Paragraph("Clock icon on lobby", td_style),
            Paragraph("Shows live days and hours remaining until Summer GCSE and A-Level maths exam papers.", td_style)
        ],
        [
            Paragraph("<b>Revision Resources</b>", td_style),
            Paragraph("Resources tab in menu", td_style),
            Paragraph("Upload worksheets, YouTube links, or past paper links. You can tag them by topic (like Algebra or Geometry) for students.", td_style)
        ]
    ]
    story.append(make_clean_table(tools_list, [130, 120, 245]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Activity Logs (Checking Who Did What)", h2_style))
    story.append(Paragraph(
        "If you ever wonder: <i>'Who cancelled this lesson?'</i> or <i>'When was that delay posted?'</i>, open the <b>Settings & Logs</b> tab "
        "and click <b>Activity Logs</b>. It shows an exact list with dates, times, and names for every single action taken on the site.",
        body_style
    ))

    story.append(Paragraph("How to Download a Complete System Backup", h2_style))
    story.append(Paragraph("1. Open the <b>Settings</b> tab in the top menu.", num_style))
    story.append(Paragraph("2. Scroll down to the <b>Database Backup</b> card.", num_style))
    story.append(Paragraph("3. Click the blue <b>'Download System Backup (.json)'</b> button.", num_style))
    story.append(Paragraph("4. A file will download to your computer containing all your students, lessons, and settings.", num_style))
    story.append(Paragraph("• <i>Safety feature:</i> The backup file automatically removes all tutor passwords for security.", num_style))
    story.append(Paragraph("• <i>Good practice:</i> Download one backup at the end of each month and save it to your Google Drive or computer.", num_style))

    story.append(Spacer(1, 6))
    story.append(make_tip_box(
        "Website addresses to remember",
        "• Student portal: <b>https://portal.lbmathstuition.co.uk</b><br/>"
        "• Staff login: <b>https://portal.lbmathstuition.co.uk/login</b><br/>"
        "• If you ever need technical help or want to add a new feature, contact Luke."
    ))

    doc.build(story, canvasmaker=WordStyleNumberedCanvas)
    print(f"Successfully generated Word-style 6-page guide: {filename}")

if __name__ == "__main__":
    out_path = "docs/LB_Maths_Tuition_Admin_Usage_Guide.pdf"
    if len(sys.argv) > 1:
        out_path = sys.argv[1]
    build_word_style_pdf(out_path)
