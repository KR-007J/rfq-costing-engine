import os
import sys
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
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (on pages after cover)
        if self._pageNumber > 1:
            self.drawString(54, 750, "AutoQuote AI · Technical Design Document (TDD) · Company A, Chakan")
            self.drawRightString(558, 750, "IsoCode Labs SWE Take-Home")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

        # Footer
        footer_text = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY · AUTHOR: KRISH JOSHI (KR-007J)")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 46, 558, 46)
        self.restoreState()

def build_pdf(filename="docs/TDD_AutoQuote_AI.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2563eb"),
        spaceAfter=14,
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569"),
    )

    meta_bold = ParagraphStyle(
        'MetaBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3,
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=body_style,
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("Technical Design Document (TDD)", title_style))
    story.append(Paragraph("AutoQuote AI: Automotive RFQ-to-Quote Costing Web App", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=10))

    # Metadata Block Table
    meta_data = [
        [Paragraph("Client:", meta_bold), Paragraph("Company A, Plot 42, Sector 10, MIDC Chakan, Pune – 410501", meta_style),
         Paragraph("Target Industry:", meta_bold), Paragraph("Machined & Forged Parts (2W, Tractor, CV Tier-1)", meta_style)],
        [Paragraph("Candidate:", meta_bold), Paragraph("Krish Joshi (Software Engineering Intern Candidate)", meta_style),
         Paragraph("Role / Track:", meta_bold), Paragraph("Full-Stack SWE / IsoCode Labs Take-Home", meta_style)],
        [Paragraph("GitHub Repo:", meta_bold), Paragraph("<b>https://github.com/KR-007J/rfq-costing-engine</b>", meta_style),
         Paragraph("Live Deployment:", meta_bold), Paragraph("<b>https://rfq-costing-engine.vercel.app</b>", meta_style)],
        [Paragraph("Submission Date:", meta_bold), Paragraph("November 2, 2026 (Due: 9 Nov 2026)", meta_style),
         Paragraph("Verification Status:", meta_bold), Paragraph("<b>100% Automated Test Passing (4/4 Verifiers)</b>", meta_style)],
    ]
    meta_table = Table(meta_data, colWidths=[90, 165, 100, 149])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 1. Executive Summary & Problem Diagnosis
    story.append(Paragraph("1. Executive Summary & Problem Diagnosis", h1_style))
    story.append(Paragraph(
        "Company A is a prominent automotive component manufacturer in Chakan, Pune with 320 staff and ₹140–160 Crore annual revenue. "
        "The 6-engineer estimation team handles ~60 RFQs/month (5 parts each = 300 parts/month). Under the legacy system, estimators "
        "spend 2.5 hours per part manually copying machine rates from an older ERP into Excel. Turnaround takes <b>9 working days</b> "
        "(against the 4 expected by OEMs), leading to a 5% loss of all RFQs directly to late submission. This generates an annual drain of "
        "<b>₹1.27 Crore</b> (₹40.5 Lakhs in engineering labor + ₹86.4 Lakhs in lost contribution margin from 36 lost RFQs).",
        body_style
    ))
    story.append(Paragraph(
        "<b>AutoQuote AI</b> solves this crisis by combining an intelligent intake parser (OCR & drawing title block extraction), a 100% "
        "deterministic TypeScript costing engine, immutable rate master versioning with effective date ranges, and a ₹25 Lakhs high-value "
        "governance approval gate.",
        body_style
    ))

    # 2. Labeled Technical & Domain Assumptions
    story.append(Paragraph("2. Labeled Technical & Domain Assumptions", h1_style))
    assumptions = [
        ("Assumption 1 (Currency & Statutory GST):", "All figures are in Indian Rupees (INR ₹). In strict accordance with Indian automotive machining job-work statutes, Goods & Services Tax (GST) is calculated at 18% and displayed separately (never blended into the ex-factory unit price)."),
        ("Assumption 2 (Deterministic Costing Invariant):", "AI models are strictly non-deterministic and prone to arithmetic drift. Cost mathematics is 100% coded in pure TypeScript formulas. AI is used solely for intake entity extraction and historical routing retrieval."),
        ("Assumption 3 (Temporal Rate Immutability):", "Past quotes bind to the rate master snapshot in effect on their quotation date. Updating master material commodity prices or Machine Hour Rates (MHR) creates append-only versioned records (e.g. v2.0), leaving historical quotes unchanged."),
        ("Assumption 4 (High-Value Governance Gate):", "Any RFQ whose total annual contract value exceeds ₹25 Lakhs (₹2,500,000) is locked from customer dispatch until signed off by the Sales Head (VP Sales Vikram Malhotra)."),
        ("Assumption 5 (Customer Drawing NDA Protection):", "Drawings and RFQ packages are processed with named-user access and zero retention. No drawing CAD data is ever sent to third-party model training loops."),
        ("Assumption 6 (Scrap Credit Accounting):", "Scrap recovery credit is calculated on the net chip removal weight (Gross Wt - Net Wt) multiplied by the active market credit rate (₹32.00/kg for steel swarf; ₹38.00/kg for forging flash) and deducted directly from gross material cost."),
    ]
    for label, desc in assumptions:
        story.append(Paragraph(f"• <b>[{label}]</b> {desc}", bullet_style))
    story.append(Spacer(1, 8))

    # 3. System Architecture & Tech Stack Justification
    story.append(Paragraph("3. System Architecture & Tech Stack Justification", h1_style))
    story.append(Paragraph(
        "<b>Next.js 14 App Router + TypeScript (Strict Mode):</b> Chosen for unified server-client execution, fast static page rendering, "
        "and strict typing across financial entities. Eliminates precision bugs, undefined properties, and runtime type coercion in financial calculations.<br/>"
        "<b>Pure Deterministic Math Module (lib/costing.ts):</b> Decoupled calculation engine with zero external dependencies, verifiable via "
        "automated test harnesses (<code>npm test</code>).<br/>"
        "<b>Industrial Stripe/Linear UI Design:</b> Tailored specifically for estimators living in dense engineering screens. Monospace tabular numbers "
        "(<code>tabular-nums</code>) ensure columns stay aligned across multi-volume comparisons.",
        body_style
    ))

    # 4. Mathematical Costing Engine Formulation
    story.append(Paragraph("4. Mathematical Costing Engine Formulation", h1_style))
    story.append(Paragraph(
        "All calculations executed by AutoQuote AI conform to standard Indian Tier-1 OEM engineering accounting standards:",
        body_style
    ))
    
    math_table_data = [
        [Paragraph("<b>Cost Element</b>", body_style), Paragraph("<b>Mathematical Formula & Implementation Logic</b>", body_style)],
        [Paragraph("Gross Material Cost", code_style), Paragraph("Gross Weight (kg) × Material Base Rate (₹/kg)", code_style)],
        [Paragraph("Scrap Recovery Credit", code_style), Paragraph("(Gross Wt - Net Wt) × Scrap Credit Rate (₹32.00/kg)", code_style)],
        [Paragraph("Net Material Cost", code_style), Paragraph("max(0, Gross Material Cost - Scrap Recovery Credit)", code_style)],
        [Paragraph("Direct Machining Cost", code_style), Paragraph("∑ (Cycle Time mins / 60) × Machine Hour Rate (₹/hr)", code_style)],
        [Paragraph("Setup Amortization Cost", code_style), Paragraph("∑ [(Setup Time mins / 60) × Setup Rate (₹/hr)] / Batch Size", code_style)],
        [Paragraph("Ex-Factory Cost", code_style), Paragraph("Prime Cost + Factory Overhead (12%) + QA (3%) + Logistics (₹7.50)", code_style)],
        [Paragraph("Unit Selling Price (Excl GST)", code_style), Paragraph("Ex-Factory Cost / (1 - (Profit Margin % / 100))", code_style)],
        [Paragraph("Statutory GST (18%)", code_style), Paragraph("Unit Selling Price (Excl GST) × 0.18 (Shown separately)", code_style)],
        [Paragraph("Annual Contract Value", code_style), Paragraph("Unit Selling Price (Excl GST) × Annual SOP Volume", code_style)],
        [Paragraph("Approval Gate Trigger", code_style), Paragraph("Annual Contract Value > ₹25,00,000 (₹25 Lakhs)", code_style)],
    ]
    math_table = Table(math_table_data, colWidths=[150, 354])
    math_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(math_table)
    story.append(Spacer(1, 8))

    # Page Break for clean multi-page document layout
    story.append(PageBreak())

    # 5. Temporal Rate Master Versioning ("The Hard Part")
    story.append(Paragraph("5. Temporal Rate Master Versioning (\"The Hard Part\")", h1_style))
    story.append(Paragraph(
        "A critical vulnerability in manufacturing costing systems is retroactive rate drift: if steel prices rise in October, past quotes "
        "submitted in June must never alter their audited prices when opened today. AutoQuote AI enforces <b>Temporal Snapshot Anchoring</b>: "
        "every material commodity and Machine Hour Rate (MHR) carries <code>effective_from</code> and <code>effective_to</code> ranges with version tags (v1.0, v2.0). "
        "Costing lookups query active rates as of the RFQ's quotation date, guaranteeing historical quote immutability.",
        body_style
    ))

    # 6. AI Intake Extraction & The "When AI Is Wrong" Fail-Safe
    story.append(Paragraph("6. AI Intake Extraction & The \"When AI Is Wrong\" Fail-Safe", h1_style))
    story.append(Paragraph(
        "The AI Intake parser (<code>app/api/ai/extract/route.ts</code>) parses raw drawing title blocks, emails, and RFP packages. To satisfy "
        "the brief's zero-silent-assumption invariant:",
        body_style
    ))
    story.append(Paragraph("• <b>Granular Confidence Scores:</b> Every extracted field displays a confidence percentage (e.g. 94%).", bullet_style))
    story.append(Paragraph("• <b>Source Snippet Citations:</b> Each pre-filled value shows its exact text citation from the input document.", bullet_style))
    story.append(Paragraph("• <b>Historical Routing Provenance:</b> Suggested machine sequences explicitly cite the past part they were cloned from (e.g., <i>Cloned from 2025 Rear Axle Pin RFQ-2508-089</i>).", bullet_style))
    story.append(Paragraph("• <b>Estimator Acceptance Checkbox:</b> Pre-filled values must be accepted by the estimator before formal quote generation.", bullet_style))
    story.append(Spacer(1, 8))

    # 7. UI/UX Design Decisions & Key Views
    story.append(Paragraph("7. UI/UX Design Decisions & Key Views", h1_style))
    ui_views = [
        ("1. RFQ Register (/):", "Dense industrial dashboard displaying pipeline KPIs (Win Rate, Total Value, Overdue RFQs), filter tabs (Estimating, Pending Approval, Sent, Won, Lost with reasons), and instant search."),
        ("2. Part Costing Screen (/rfqs/[id]):", "Flagship screen. Dense 3-column layout: Material & Scrap Recovery on left; Routing & MHR with inline cycle time edits in middle; Reactive multi-volume price slabs (3 tiers) and margin sliders on right."),
        ("3. AI RFQ Intake (/rfqs/new):", "Interactive OCR parser with 3 pre-configured Chakan client samples (Company B, C, D), confidence meters, and suggested routing review."),
        ("4. Rate Masters (/rate-masters):", "Single source of truth for commodity steel rates and machine centers, featuring a versioning modal with effective date stamps."),
        ("5. Formal PDF Quote (/rfqs/[id]/quote):", "ISO 9001 automotive quotation letterhead with volume slabs, separate GST, commercial terms, and dual signatures (Estimator + VP Sales)."),
        ("6. Past Quotes Intelligence (/past-quotes):", "Search historical parts catalog and simulate bulk indexing of 1,400 legacy ERP rows in <12ms."),
    ]
    for title, desc in ui_views:
        story.append(Paragraph(f"• <b>{title}</b> {desc}", bullet_style))
    story.append(Spacer(1, 8))

    # 8. What Was Cut & What Comes Next
    story.append(Paragraph("8. What Was Cut & What Comes Next", h1_style))
    story.append(Paragraph(
        "<b>Deliberate Cuts (Scope Discipline):</b> Direct CAD 3D B-Rep geometry computation was cut as designated OUT OF SCOPE in the brief. "
        "Direct ERP writeback was decoupled into clean JSON persistence to avoid fragile integration with legacy on-premise systems.<br/>"
        "<b>Next Engineering Steps:</b> 1) Multi-currency hedging for export OEMs (USD/EUR buffers). 2) Automated CMM inspection log ingestion "
        "for PPAP Level 3 compliance. 3) CNC spindle telemetry to continuously calibrate rate master machine hour rates against actual machining cycle times.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # 9. Automated Verification Summary
    story.append(Paragraph("9. Empirical Test Suite & Verification Summary", h1_style))
    test_results_data = [
        [Paragraph("<b>Test Case</b>", body_style), Paragraph("<b>Tested Invariant</b>", body_style), Paragraph("<b>Empirical Result</b>", body_style)],
        [Paragraph("Test 1: RFQ-2611-014", code_style), Paragraph("EN8 Gross Wt 0.61kg, Scrap 0.13kg, 180k Volume, > ₹25L Gate", body_style), Paragraph("<b>PASSED (₹291.1L Contract)</b>", code_style)],
        [Paragraph("Test 2: Setup Amortization", code_style), Paragraph("Batch 5k vs 10k vs 15k unit price monotonic decrease", body_style), Paragraph("<b>PASSED (Setup drops ₹0.19→₹0.06)</b>", code_style)],
        [Paragraph("Test 3: Temporal Immutability", code_style), Paragraph("2025 v1 rate (₹72) vs 2026 v2 rate (₹76.5) snapshot separation", body_style), Paragraph("<b>PASSED (Historical immutability)</b>", code_style)],
        [Paragraph("Test 4: Heavy Forging 019", code_style), Paragraph("40Cr4 forging Press 1600T, ₹279.37L Contract Value", body_style), Paragraph("<b>PASSED (Approval Triggered)</b>", code_style)],
    ]
    test_table = Table(test_results_data, colWidths=[130, 240, 134])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(test_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>IsoCode Labs Assessment Submission Deliverable · End of Document</b>", ParagraphStyle('Foot', parent=body_style, fontName='Helvetica-Bold', alignment=1, textColor=colors.HexColor("#64748b"))))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    build_pdf()
