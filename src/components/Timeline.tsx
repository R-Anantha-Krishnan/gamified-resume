interface TimelineProps {
  milestones: { id: string; label: string }[]
  collectedIds: string[]
  progress: number
}

function Timeline({ milestones, collectedIds, progress }: TimelineProps) {
  return (
    <section className="timeline-shell">
      <div className="timeline-copy">
        <p className="section-label">Timeline Progress</p>
        <h2>Milestones from 1998 to 2026</h2>
      </div>
      <div className="timeline-line">
        <div className="timeline-fill" style={{ width: `${progress * 100}%` }} />
        {milestones.map((milestone, index) => {
          const milestoneCollected = index < collectedIds.length
          return (
            <div key={milestone.id} className="timeline-node" style={{ left: `${(index / (milestones.length - 1)) * 100}%` }}>
              <span className={`timeline-dot ${milestoneCollected ? 'collected' : ''}`} />
              <span className="timeline-label">{milestone.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default Timeline
