/** Popeye the Sailor Man — words are derived by splitting on whitespace. */
export const POPEYE_LYRICS = `
I'm Popeye the Sailor Man
I'm Popeye the Sailor Man
I yam wot I yam
And that's all wot I yam
I'm Popeye the Sailor Man

I'm one tough Gazookus
Wot hates all Palookas
Wot ain't on the ups and square
I biffs 'em and buffs 'em
And always out roughs 'em
But none of 'em gets nowhere

If anyone dasses to risk my "Fisk"
It's "Boff" an' it's "Wham" un'erstan'?
So, keep "Good Be-hav-or"
That's your one life saver
With Popeye the Sailor Man

I'm Popeye the Sailor Man
I'm Popeye the Sailor Man
I'm strong to the finich
Cause I eats me spinach
I'm Popeye the Sailor Man
`.trim();

export function popeyeWords(): string[] {
  return POPEYE_LYRICS.split(/\s+/).filter(Boolean);
}
