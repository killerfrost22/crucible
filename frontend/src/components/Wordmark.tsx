import wordmarkUrl from '../assets/crucible-wordmark-reversed.svg'

/** The Crucible wordmark in its reversed (cream) colorway, for dark headers. */
export function Wordmark() {
  return <img className="wordmark" src={wordmarkUrl} alt="Crucible" width={392} height={78} />
}
