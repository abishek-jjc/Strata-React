import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateLeaderboardPdf(eventWinners, leaderboardData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  // 1. HEADER SECTION
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(26, 29, 35) // Dark slate
  doc.text('STRATA 2K26 — Technical Meet Results', 40, 50)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 110, 120) // Slate grey
  doc.text(`Generated on: ${new Date().toLocaleDateString()} @ ${new Date().toLocaleTimeString()}`, 40, 72)
  
  // Decorative separator line
  doc.setDrawColor(217, 119, 6) // Amber
  doc.setLineWidth(2)
  doc.line(40, 85, 555, 85)

  // 2. SECTION A: EVENT-WISE WINNERS
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(26, 29, 35)
  doc.text('Event Winners (First & Second Places)', 40, 110)

  doc.autoTable({
    startY: 125,
    margin: { left: 40, right: 40 },
    head: [['Event / Contest', 'First Place Winner', 'Second Place Winner']],
    body: eventWinners.map((row) => [
      row.event_name,
      row.first_place,
      row.second_place,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [217, 119, 6], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 150, fontStyle: 'bold' },
      1: { cellWidth: 180 },
      2: { cellWidth: 185 },
    },
  })

  const nextY = doc.lastAutoTable.finalY + 30

  // 3. SECTION B: OVERALL CHAMPIONSHIP LEADERBOARD (TOP 5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(26, 29, 35)
  doc.text('Overall Championship Standings (Top 5 Colleges)', 40, nextY)

  doc.autoTable({
    startY: nextY + 15,
    margin: { left: 40, right: 40 },
    head: [['Rank', 'College Name', 'Lot Name', '1st Places', '2nd Places', 'Total Points']],
    body: leaderboardData.map((row, idx) => [
      idx + 1,
      row.college,
      row.lot_name || '—',
      row.firsts,
      row.seconds,
      `${row.points} pts`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [12, 14, 18], fontSize: 10, fontStyle: 'bold' }, // Dark theme heading for overall championship
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 50, align: 'center' },
      1: { cellWidth: 200, fontStyle: 'bold' },
      2: { cellWidth: 75, align: 'center' },
      3: { cellWidth: 65, align: 'center' },
      4: { cellWidth: 65, align: 'center' },
      5: { cellWidth: 60, align: 'center' },
    },
  })

  // Footnote
  const footerY = doc.lastAutoTable.finalY + 25
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(120, 130, 140)
  doc.text('Note: Championship scoring is calculated as First Place = 5 points, Second Place = 3 points.', 40, footerY)

  doc.save('strata_winner_results.pdf')
}
