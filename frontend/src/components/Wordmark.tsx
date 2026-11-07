import onDarkUrl from '../assets/crucible-wordmark-reversed.svg'
import onLightUrl from '../assets/crucible-wordmark.svg'

/** The Crucible wordmark: the cream colorway on dark, the ink colorway on light. Size it with `height`. */
export function Wordmark() {
  return (
    <span className="wordmark" role="img" aria-label="Crucible">
      <img className="wordmark__img wordmark__img--on-dark" src={onDarkUrl} alt="" width={392} height={78} />
      <img className="wordmark__img wordmark__img--on-light" src={onLightUrl} alt="" width={392} height={78} />
    </span>
  )
}
