import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class TutorNumberedCanvas(canvas.Canvas):
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
        self.drawString(50, A4[1] - 32, "LB Maths Tuition — Tutor Portal Guide")
        self.setStrokeColor(colors.HexColor("#D0D5DD"))
        self.setLineWidth(0.5)
        self.line(50, A4[1] - 36, A4[0] - 50, A4[1] - 36)

        # Word-like footer
        self.line(50, 42, A4[0] - 50, 42)
        self.drawString(50, 30, "Internal staff guide for Tutors")
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
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t

def make_clean_table(data, col_widths, padding=4):
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2B579A")), # Microsoft Word dark blue
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), padding),
        ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t

def build_tutor_guide_pdf(filename="docs/LB_Maths_Tuition_Tutor_Usage_Guide.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)

    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=50,
        rightMargin=50,
        topMargin=46,
        bottomMargin=46
    )

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
    # PAGE 1: WELCOME & LOGGING IN
    # =========================================================================
    story.append(Paragraph("Page 1: Welcome to the Tutor Workspace", title_style))
    story.append(Paragraph("How to log in, what you can see, classroom tools, and dashboard overview.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Welcome to the Team!", h2_style))
    story.append(Paragraph(
        "The Tutor Portal is your personal teaching dashboard at LB Maths Tuition. "
        "It gives you direct access to your upcoming lessons, Microsoft Teams meeting links, student lesson topics, "
        "and hourly earnings. Everything you need to teach online lessons is organized here in one clean place.",
        body_style
    ))

    story.append(Paragraph("How to Log In", h2_style))
    story.append(Paragraph("1. Open your browser and go to: <b>https://portal.lbmathstuition.co.uk/login</b>", num_style))
    story.append(Paragraph("2. Enter your tutor email address (e.g. <code>dan@lbmathstuition.co.uk</code>) and password.", num_style))
    story.append(Paragraph("3. Click <b>'Sign In'</b>. You will be taken straight to your Tutor Workspace.", num_style))

    story.append(Paragraph("What You Can See (Privacy by Design)", h2_style))
    story.append(Paragraph(
        "The platform protects both staff and family confidentiality:<br/>"
        "• <b>Only your students:</b> You only ever see students assigned to you. You cannot see other tutors' pupils.<br/>"
        "• <b>Your pay is clear and private:</b> You see your agreed hourly pay rate and monthly earnings. You never see the fees charged to families.<br/>"
        "• <b>Direct student help:</b> You can view your students' 4-digit PINs, copy their login links, and see what math topics they requested help with.",
        body_style
    ))

    story.append(Paragraph("What Each Tab Does (Top of the Screen)", h2_style))
    tutor_tabs = [
        [Paragraph("Tab", th_style), Paragraph("Where it is", th_style), Paragraph("What it does", th_style)],
        [
            Paragraph("<b>Next Meeting &amp; Live</b>", td_style),
            Paragraph("First tab (clock icon)", td_style),
            Paragraph("Your active lesson deck. Shows your next lesson countdown, student online status, Teams join button, and delay buttons.", td_style)
        ],
        [
            Paragraph("<b>My Assigned Students</b>", td_style),
            Paragraph("Second tab (users icon)", td_style),
            Paragraph("Your student directory. Check student PINs, copy Magic Links for parents, unlock forgotten PINs, and read past lesson notes.", td_style)
        ],
        [
            Paragraph("<b>Upcoming Lessons</b>", td_style),
            Paragraph("Third tab (calendar icon)", td_style),
            Paragraph("Full list of scheduled, pending completion, and paid lessons. Shows your monthly hours and earnings breakdown.", td_style)
        ],
        [
            Paragraph("<b>Shared Resources</b>", td_style),
            Paragraph("Fourth tab (book icon)", td_style),
            Paragraph("Download worksheets, past papers, and topic notes. You can also upload your own worksheets to share with students.", td_style)
        ],
        [
            Paragraph("<b>Settings</b>", td_style),
            Paragraph("Fifth tab (gear icon)", td_style),
            Paragraph("Change your tutor password, enable Web Push notifications for upcoming lessons, and get your phone calendar sync feed.", td_style)
        ]
    ]
    story.append(make_clean_table(tutor_tabs, [125, 115, 255], padding=3))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Built-In Classroom Tools (Top Header Bar)", h2_style))
    story.append(Paragraph("• <b>fx-83GTX:</b> Full virtual scientific calculator on screen with exact fractions and roots. Great to demo calculations during lessons.", bullet_style))
    story.append(Paragraph("• <b>Formula Sheet:</b> Instant pop-up with official GCSE (Edexcel &amp; AQA) and A-Level (Edexcel, AQA &amp; OCR) formula sheets.", bullet_style))
    story.append(Paragraph("• <b>My Timetable:</b> Opens your weekly schedule grid where you can view booked slots and mark times you cannot teach.", bullet_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: TIMETABLE & SETTING UNAVAILABILITY
    # =========================================================================
    story.append(Paragraph("Page 2: Your Timetable & Setting Unavailability", title_style))
    story.append(Paragraph("How to check your weekly calendar, block busy hours, and book holidays.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Opening Your Interactive Timetable", h2_style))
    story.append(Paragraph(
        "Click the <b>'My Timetable'</b> button in the top header. "
        "This opens a full-screen weekly grid (Monday to Sunday, 08:00 to 24:00) showing all your scheduled lessons, "
        "your personal unavailable hours, and your booked holidays. A red pulsing line shows the exact current time today.",
        body_style
    ))

    story.append(Paragraph("Navigating Weeks", h2_style))
    story.append(Paragraph("• <b>&lt; (Previous Week) and &gt; (Next Week):</b> Shifts the calendar backward or forward by 7 days.", bullet_style))
    story.append(Paragraph("• <b>[Current Week] Button:</b> If you navigate to future or past dates, click this button to jump straight back to today's week.", bullet_style))
    story.append(Paragraph("• <b>[X] Close:</b> Closes the timetable modal and returns you to your main dashboard.", bullet_style))

    story.append(Paragraph("Blocking Out Unavailable Hours (Busy Slots)", h2_style))
    story.append(Paragraph(
        "If you have university lectures, doctor appointments, or personal commitments, block them out so the Head Tutor "
        "does not accidentally schedule lessons over you:",
        body_style
    ))
    story.append(Paragraph("1. Click the amber <b>'+ Set Unavailable / Holiday'</b> button (top right of the calendar).", num_style))
    story.append(Paragraph("2. Stay on the <b>'Hourly Blackout'</b> tab.", num_style))
    story.append(Paragraph("3. Pick the <b>Date</b>, <b>Start Time</b>, and <b>End Time</b> (e.g. Wednesday 14:00 to 16:00).", num_style))
    story.append(Paragraph("4. <i>Repeats every week?</i> Use the <b>'Repeat Weekly'</b> dropdown to repeat it for up to 12 weeks automatically.", num_style))
    story.append(Paragraph("5. Add an optional reason (e.g. <i>'University lecture'</i>) and click <b>'Save Blackout'</b>.", num_style))
    story.append(Paragraph("• <i>Quick tip:</i> You can also click any empty 30-minute slot on the calendar grid to block that time immediately.", num_style))

    story.append(Paragraph("Booking Multi-Day Holidays &amp; Time Away", h2_style))
    story.append(Paragraph(
        "When taking leave (such as summer vacation or exam revision week), mark it as a holiday:<br/>"
        "1. Click <b>'+ Set Unavailable / Holiday'</b> and select the <b>'Book Holiday'</b> tab.<br/>"
        "2. Choose your <b>Start Date</b> and <b>End Date</b> (e.g. 1st August to 14th August).<br/>"
        "3. Enter a short reason (e.g. <i>'Family holiday'</i>) and click <b>'Confirm Holiday'</b>.<br/>"
        "• Your holiday appears with an amber palm tree badge across those days, and the system physically blocks any bookings during that time.",
        body_style
    ))

    story.append(Paragraph("Helpful Timetable Buttons", h2_style))
    timetable_table = [
        [Paragraph("Button", th_style), Paragraph("Where to find it", th_style), Paragraph("What it does", th_style)],
        [
            Paragraph("<b>[Copy Week &rarr; Next]</b>", td_style),
            Paragraph("Calendar subheader bar", td_style),
            Paragraph("Copies all hourly blackout blocks from this week into next week in one click so you don't have to re-enter regular slots.", td_style)
        ],
        [
            Paragraph("<b>[Edit Time]</b>", td_style),
            Paragraph("Click on any lesson card", td_style),
            Paragraph("Adjust start and end times in 5-minute increments directly on the grid.", td_style)
        ],
        [
            Paragraph("<b>[Remove Block]</b>", td_style),
            Paragraph("Click on any blackout block", td_style),
            Paragraph("Deletes your unavailable hour or holiday, instantly reopening that slot for teaching.", td_style)
        ]
    ]
    story.append(make_clean_table(timetable_table, [130, 140, 225], padding=3))
    story.append(Spacer(1, 4))

    story.append(make_tip_box(
        "Keep your availability up to date",
        "If your availability changes for next term, enter your blackouts as early as possible. The booking engine will automatically protect your schedule."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: RUNNING A LESSON (TEAMS & DELAYS)
    # =========================================================================
    story.append(Paragraph("Page 3: Running a Lesson (Teams, Topics & Delays)", title_style))
    story.append(Paragraph("Finding your next lesson, setting your Teams link, and using delay buttons.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("The Live Deck (Your Teaching Home Screen)", h2_style))
    story.append(Paragraph(
        "Open the <b>'Next Meeting &amp; Live'</b> tab. Whenever you have an upcoming or live lesson, "
        "a large blue-bordered lesson deck appears at the top of your screen with all the vital details:",
        body_style
    ))

    live_deck_features = [
        [Paragraph("Element", th_style), Paragraph("What it shows", th_style), Paragraph("Why it's helpful", th_style)],
        [
            Paragraph("<b>Live Countdown Badge</b>", td_style),
            Paragraph("Shows exact minutes until start (e.g. <i>'Starts in 14m'</i> or green <i>'Live Now'</i>).", td_style),
            Paragraph("Keeps you perfectly on time for your lesson start.", td_style)
        ],
        [
            Paragraph("<b>Student Online Indicator</b>", td_style),
            Paragraph("A pulsing green dot appears next to the student's name if they have the website open.", td_style),
            Paragraph("You know the student is sitting at their computer ready before you even ring them.", td_style)
        ],
        [
            Paragraph("<b>Requested Lesson Topic</b>", td_style),
            Paragraph("Displays topics entered by the student (e.g. <i>'Quadratic formula homework'</i>).", td_style),
            Paragraph("Lets you pull up worksheets or past papers 5 minutes before the lesson starts.", td_style)
        ],
        [
            Paragraph("<b>Teams Meeting Box</b>", td_style),
            Paragraph("Shows your Microsoft Teams meeting link with an <b>'Update Link'</b> button.", td_style),
            Paragraph("Save your meeting link once and the site remembers it automatically for this student.", td_style)
        ]
    ]
    story.append(make_clean_table(live_deck_features, [125, 195, 175], padding=3.5))
    story.append(Spacer(1, 6))

    story.append(Paragraph("How to Join the Microsoft Teams Call", h2_style))
    story.append(Paragraph("1. Check that your Microsoft Teams meeting link is in the box.", num_style))
    story.append(Paragraph("2. When it's time, click the large blue <b>'Join Microsoft Teams'</b> button.", num_style))
    story.append(Paragraph("3. The Teams meeting opens in a new tab. Your student clicks their matching button on their screen to join you.", num_style))

    story.append(Paragraph("Running Late? The Tutor Delay Buttons (+5m / +10m)", h2_style))
    story.append(Paragraph(
        "If you are held up in traffic, delayed in another lesson, or having technical issues, "
        "<b>do not leave the student wondering</b>. Use the built-in delay buttons:",
        body_style
    ))
    story.append(Paragraph("1. Click the amber <b>'+5m'</b> or <b>'+10m'</b> button on the live lesson card.", num_style))
    story.append(Paragraph("2. A popup asks for an optional reason (e.g. <i>'Finishing previous student's exam question'</i>).", num_style))
    story.append(Paragraph("3. Click <b>'Notify Student of Delay'</b>.", num_style))
    story.append(Paragraph(
        "• <b>What the student experiences:</b> A friendly yellow delay notification immediately pops up on their screen, "
        "their countdown adjusts forward, and a gentle chime plays so they know you are on your way.",
        body_style
    ))

    story.append(Paragraph("The 5-Minute Student Unlock Rule", h2_style))
    story.append(Paragraph(
        "Students can log into the website early to see the countdown and formula sheets, "
        "but their <i>'Join Teams Call'</i> button will only turn blue and clickable <b>5 minutes before the lesson start time</b>. "
        "This prevents children from sitting unattended in a video call before you arrive.",
        body_style
    ))

    story.append(Spacer(1, 4))
    story.append(make_tip_box(
        "Teams links remember automatically",
        "Once you paste your personal Teams meeting room link for a student, the system automatically saves it as the default for all future lessons with that student."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: COMPLETING LESSONS & HOMEWORK
    # =========================================================================
    story.append(Paragraph("Page 4: Completing Lessons, Homework & Notes History", title_style))
    story.append(Paragraph("How to log lesson feedback, assign homework, and check previous student notes.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Why Completing Lessons Immediately Is Important", h2_style))
    story.append(Paragraph(
        "As soon as your lesson finishes, click <b>'Complete Lesson'</b>. Doing this right away is essential because:<br/>"
        "1. <b>It calculates your pay:</b> Completed lessons are automatically added to your monthly payroll summary.<br/>"
        "2. <b>Parents see your notes:</b> Parents can log into their child's portal and see exactly what math was covered.<br/>"
        "3. <b>Student homework is saved:</b> Students see their homework tasks and due dates clearly displayed on their screen.",
        body_style
    ))

    story.append(Paragraph("Step-by-Step: How to Complete a Lesson", h2_style))
    story.append(Paragraph("1. On the lesson card, click the green <b>'Complete Lesson'</b> button.", num_style))
    story.append(Paragraph("2. Fill in the short completion form:", num_style))

    complete_form_table = [
        [Paragraph("Form Field", th_style), Paragraph("What to write", th_style), Paragraph("Example", th_style)],
        [
            Paragraph("<b>Topics Covered</b>", td_style),
            Paragraph("The specific mathematical skills taught in this session.", td_style),
            Paragraph("<i>'Simultaneous equations by elimination and substitution'</i>", td_style)
        ],
        [
            Paragraph("<b>Homework Given</b>", td_style),
            Paragraph("Specific exercises, worksheet questions, or past paper pages.", td_style),
            Paragraph("<i>'Complete Corbettmaths Worksheet 295, questions 1 to 6'</i>", td_style)
        ],
        [
            Paragraph("<b>Lesson Rating (1 to 5 Stars)</b>", td_style),
            Paragraph("How well the student engaged and understood the concepts.", td_style),
            Paragraph("Click the stars (4 or 5 stars for great focus)", td_style)
        ],
        [
            Paragraph("<b>Lesson Notes &amp; Next Steps</b>", td_style),
            Paragraph("Helpful observations, areas of strength, or what to tackle next session.", td_style),
            Paragraph("<i>'Excellent progress on negative coefficients. Need to review fractions next week.'</i>", td_style)
        ]
    ]
    story.append(make_clean_table(complete_form_table, [125, 175, 195], padding=3.5))
    story.append(Spacer(1, 5))

    story.append(Paragraph("3. Click <b>'Save &amp; Complete Lesson'</b>. A celebration chime confirms it's saved.", num_style))

    story.append(Paragraph("What If You Forget? (Uncompleted Lessons Banner)", h2_style))
    story.append(Paragraph(
        "If you ever forget to complete a lesson after class, an amber warning banner appears at the top of your dashboard: "
        "<i>'Uncompleted Previous Lesson with [Student Name]'</i>. Simply click <b>'Complete Now'</b> to enter your notes.",
        body_style
    ))

    story.append(Paragraph("Checking Previous Lesson Notes &amp; Homework History", h2_style))
    story.append(Paragraph(
        "Need to see what you taught a student last week or check what homework was set?<br/>"
        "• <b>Quick check:</b> Click <b>'Notes History'</b> on the student's card to open their chronological homework history.<br/>"
        "• <b>Search notes:</b> You can type keywords (e.g. <i>'Vectors'</i> or <i>'Trigonometry'</i>) to instantly locate past exercises.",
        body_style
    ))

    story.append(Spacer(1, 4))
    story.append(make_tip_box(
        "Accidental completion warning",
        "If you accidentally click 'Complete Lesson' on a session that hasn't started yet according to the schedule, the system will ask 'Are you sure? This lesson hasn't started yet'. This prevents closing future bookings."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: MANAGING STUDENTS & LOCKED PINS
    # =========================================================================
    story.append(Paragraph("Page 5: Managing Students & Helping Locked PINs", title_style))
    story.append(Paragraph("Student directory, sending magic links to parents, and unlocking accounts.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Your Student Directory (My Assigned Students Tab)", h2_style))
    story.append(Paragraph(
        "Click the <b>'My Assigned Students'</b> tab to view all pupils allocated to you. "
        "Each student card gives you everything you need to communicate with the family and assist with logins:",
        body_style
    ))

    student_card_elements = [
        [Paragraph("Card Element", th_style), Paragraph("Where it is", th_style), Paragraph("How to use it", th_style)],
        [
            Paragraph("<b>4-Digit Student PIN</b>", td_style),
            Paragraph("Top-right badge on card", td_style),
            Paragraph("The student's personal PIN (e.g. <code>4821</code>). If a child forgets their numbers, you can read it to them instantly.", td_style)
        ],
        [
            Paragraph("<b>Magic Link (One-Click)</b>", td_style),
            Paragraph("Click <b>'Copy Link'</b> button", td_style),
            Paragraph("Copies a private link (e.g. <code>.../student?key=...</code>). Send this to parents via WhatsApp or email for password-free login.", td_style)
        ],
        [
            Paragraph("<b>Parent Contact Details</b>", td_style),
            Paragraph("Under student name", td_style),
            Paragraph("Shows parent email and optional mobile phone number for lesson coordination or homework updates.", td_style)
        ],
        [
            Paragraph("<b>Unlock PIN Button</b>", td_style),
            Paragraph("Appears if locked (red badge)", td_style),
            Paragraph("Click to instantly reset a locked account so a student who entered the wrong PIN can try again right away.", td_style)
        ]
    ]
    story.append(make_clean_table(student_card_elements, [125, 125, 245], padding=3.5))
    story.append(Spacer(1, 6))

    story.append(Paragraph("The Two Ways Students Can Log In", h2_style))
    story.append(Paragraph(
        "• <b>Method 1: 4-Digit PIN (Laptops &amp; PCs):</b> The student opens <code>portal.lbmathstuition.co.uk</code>, clicks their name, and types their 4 numbers.<br/>"
        "• <b>Method 2: Direct Magic Link (iPads &amp; Tablets):</b> Clicking the link logs the student in without typing any numbers. "
        "Recommend that parents bookmark this link to the child's tablet home screen.",
        body_style
    ))

    story.append(Paragraph("What to Do If a Student Gets Locked Out", h2_style))
    story.append(Paragraph(
        "To prevent anyone guessing PINs, if a student enters incorrect numbers <b>5 times in a row</b>, their account locks for 15 minutes.<br/>"
        "1. Open the <b>My Assigned Students</b> tab.<br/>"
        "2. Look for the red <i>'PIN Locked'</i> badge next to their name.<br/>"
        "3. Click the blue <b>'Unlock PIN'</b> button. The lockout is cleared instantly, and the student can log in immediately.",
        body_style
    ))

    story.append(Paragraph("Student Absence / Lesson Cancellation", h2_style))
    story.append(Paragraph(
        "If a family informs you that they cannot attend a lesson:<br/>"
        "• You can click <b>'Cancel'</b> on the lesson card. A popup lets you enter an optional reason (e.g. <i>'Family illness - rescheduling for Thursday'</i>).<br/>"
        "• If a lesson needs to be rescheduled to a new day or time, notify the Head Tutor who can move the session on the master timetable.",
        body_style
    ))

    story.append(Spacer(1, 4))
    story.append(make_tip_box(
        "Encourage tablet users to save their Magic Link",
        "For younger students using iPads, sending the parent their Magic Link saves huge amounts of time at the start of lessons. One tap on their home screen opens their countdown."
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: EARNINGS, CALENDAR SYNC & ROUTINE
    # =========================================================================
    story.append(Paragraph("Page 6: Earnings, Calendar Sync & Daily Checklist", title_style))
    story.append(Paragraph("Tracking your monthly payout, syncing to your phone calendar, and best practices.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SUBTITLE_COLOR, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("How Your Earnings &amp; Payroll Work", h2_style))
    story.append(Paragraph(
        "Open the <b>'Upcoming Lessons'</b> tab to review your teaching hours and pay summary. "
        "The platform automatically tracks every lesson you teach:",
        body_style
    ))

    pay_elements = [
        [Paragraph("Pay Metric", th_style), Paragraph("What it means", th_style)],
        [
            Paragraph("<b>Hourly Rate</b>", td_style),
            Paragraph("Your agreed teaching rate per hour (e.g. £25.00/hr or £30.00/hr) as set by the Head Tutor.", td_style)
        ],
        [
            Paragraph("<b>Pending Tutor Payout</b>", td_style),
            Paragraph("Wages owed to you for lessons you have taught and marked as completed, waiting for monthly payroll bank transfer.", td_style)
        ],
        [
            Paragraph("<b>Archived &amp; Paid</b>", td_style),
            Paragraph("Past lessons that have already been settled and paid into your bank account by the Head Tutor.", td_style)
        ],
        [
            Paragraph("<b>Proportional Calculation</b>", td_style),
            Paragraph("Pay is calculated accurately to the minute. For example, a 45-minute lesson at £30/hr calculates exactly as £22.50.", td_style)
        ]
    ]
    story.append(make_clean_table(pay_elements, [140, 355], padding=3.5))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Syncing Lessons to Your Phone Calendar (iCal Feed)", h2_style))
    story.append(Paragraph(
        "You can sync all your LB Maths Tuition lessons directly to your Apple Calendar, Google Calendar, or Outlook on your phone or laptop:<br/>"
        "1. Open the <b>Settings</b> tab.<br/>"
        "2. Find the <b>Calendar Subscription (iCal)</b> section.<br/>"
        "3. Copy your personal feed URL (or click <i>'Subscribe with Apple Calendar / Outlook'</i>).<br/>"
        "4. Paste it into your calendar app as a 'Subscribed Calendar'. Any new lesson booked by the admin will automatically appear on your phone!",
        body_style
    ))

    story.append(Paragraph("Exporting a One-Off Week Schedule (.ics)", h2_style))
    story.append(Paragraph(
        "If you prefer not to subscribe, click <b>'Export Week (.ics)'</b> on your Upcoming Lessons tab. "
        "This downloads a calendar file containing all your lessons for that specific week.",
        body_style
    ))

    story.append(Paragraph("The 5-Minute Tutor Routine Checklist", h2_style))
    story.append(Paragraph("<b>Before the Lesson (5 mins prior):</b> Check student requested topics, confirm Teams link is ready, look for green online dot.", bullet_style))
    story.append(Paragraph("<b>At Lesson Time:</b> Click 'Join Microsoft Teams'. If running 2+ mins late, hit the +5m delay button to notify the family.", bullet_style))
    story.append(Paragraph("<b>After the Lesson (Immediately):</b> Click 'Complete Lesson', log topics covered and homework set, and save.", bullet_style))

    story.append(Spacer(1, 4))
    story.append(make_tip_box(
        "Need help or schedule adjustments?",
        "• Head Tutor / Admin contact: Luke (LB Maths Tuition)<br/>"
        "• Staff Login portal: <b>https://portal.lbmathstuition.co.uk/login</b><br/>"
        "• If you ever forget your password, the Head Tutor can reset it for you in seconds."
    ))

    doc.build(story, canvasmaker=TutorNumberedCanvas)
    try:
        import shutil
        pub_path = os.path.join("public", "docs", os.path.basename(filename))
        os.makedirs(os.path.dirname(pub_path), exist_ok=True)
        shutil.copyfile(filename, pub_path)
    except Exception as e:
        print(f"Warning: could not copy to public/docs: {e}")
    print(f"Successfully generated Word-style 6-page tutor guide: {filename}")

if __name__ == "__main__":
    out_path = "docs/LB_Maths_Tuition_Tutor_Usage_Guide.pdf"
    if len(sys.argv) > 1:
        out_path = sys.argv[1]
    build_tutor_guide_pdf(out_path)
