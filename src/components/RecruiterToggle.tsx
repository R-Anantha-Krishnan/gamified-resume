interface Props {
  isAutoPlay: boolean
  onToggle: (value: boolean) => void
}

function RecruiterToggle({ isAutoPlay, onToggle }: Props) {
  return (
    <div className="toggle-card">
      <p className="section-label">Recruiter Mode</p>
      <button className="button button-secondary" onClick={() => onToggle(!isAutoPlay)}>
        {isAutoPlay ? 'Disable Auto Play' : 'Enable Auto Play'}
      </button>
    </div>
  )
}

export default RecruiterToggle
