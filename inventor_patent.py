from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.platypus import Flowable

styles = getSampleStyleSheet()
story=[]

def fig(title):
    d=Drawing(400,200)
    d.add(Rect(10,50,120,80,strokeWidth=1))
    d.add(String(20,90,"Component",fontSize=10))
    return d

story.append(Paragraph("Inventor Packet v2 — CTBAL", styles['Title']))
story.append(Paragraph("Assignee: KHM LLC", styles['Normal']))
story.append(Spacer(1,12))
story.append(Paragraph("Summary and Specification Updated...", styles['Normal']))
story.append(PageBreak())
story.append(Paragraph("FIG.5 – Hybrid Deployment Model", styles['Heading2']))
story.append(fig("FIG5"))
story.append(Paragraph("Local node + Sepolia workflow diagram (simplified).", styles['Normal']))

filename="/mnt/data/Inventor_Packet_v2.pdf"
doc=SimpleDocTemplate(filename,pagesize=letter)
doc.build(story)

filename
