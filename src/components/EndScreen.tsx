interface Props {
  collectedCount: number
  totalCount: number
  onRestart: () => void
}

function EndScreen({ collectedCount, totalCount, onRestart }: Props) {
  const downloadResume = () => {
    const resumeText = `Resume Summary\n\nAchievements collected: ${collectedCount}/${totalCount}\n\nThis demo represents the career journey from school to senior software engineer.`
    const blob = new Blob([resumeText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Gamified-Resume-Overview.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card--end">
        <p className="section-label">Journey Complete</p>
        <h2>Congratulations!</h2>
        <p className="modal-copy">You collected every milestone and finished the gamified resume experience.</p>
        <div className="end-actions">
          <button className="button button-primary" onClick={downloadResume}>
            Download Resume
          </button>
          <a
            className="button button-secondary"
            href="https://www.linkedin.com/in/r-anantha-krishnan-212974140/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <a
            className="button button-secondary"
            href="https://github.com/R-Anantha-Krishnan"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            className="button button-secondary"
            href="https://r-anantha-krishnan.github.io/"
            target="_blank"
            rel="noreferrer"
          >
            Portfolio
          </a>
        </div>
        <button className="button button-tertiary" onClick={onRestart}>
          Restart Journey
        </button>
      </div>
    </div>
  )
}

export default EndScreen
