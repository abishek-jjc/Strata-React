import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateLeaderboardPdf(leaderboardData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Strata — Overall College Championship', 40, 50)

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Generated on: ${new Date().toLocaleDateString()} @ ${new Date().toLocaleTimeString()}`, 40, 75)
  doc.text('Scoring System: First Place = 5 points | Second Place = 3 points', 40, 92)

  // Table grid
  doc.autoTable({
    startY: 120,
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
    headStyles: { fillColor: [217, 119, 6] }, // Amber color matching Admin theme accent
    styles: { fontSize: 10 },
  })

  doc.save('strata_championship_leaderboard.pdf')
}
