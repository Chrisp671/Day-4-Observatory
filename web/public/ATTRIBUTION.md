# Planet photo attribution

The five photographs in `planets/` are NASA reference imagery, in the public
domain (NASA-produced material is not protected by copyright unless noted;
see [NASA Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)).
They show each planet as a spacecraft once saw it — not the sky tonight, not
the current phase or apparent size — and the app says so beside every one.

Each file was downloaded once from the NASA Image and Video Library
(`images-assets.nasa.gov`, the `~orig.jpg` rendition), reduced to a longest
edge of 1024 px with Pillow (Lanczos), and saved as progressive JPEG at
quality 80. No colour work or retouching, and no cropping except Venus: NASA's
file is a two-panel comparison, and only its left panel (the single globe,
pixels 0–1122 of 2245) is shipped. The SHA-256 of each original as downloaded
on 2026-09-17 is recorded so the source can be re-verified.

| File | NASA ID | Title | Credit | Released | Shipped size | Source SHA-256 |
|---|---|---|---|---|---|---|
| `planets/mercury.jpg` | [PIA16853](https://images.nasa.gov/details/PIA16853) | Colors of the Innermost Planet: View 1 (MESSENGER, enhanced colour) | NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington | 2013-02-18 | 1024×576, 73 KB | `bdcb9569ddb0656befd16ab9a622b3de0791a58308adec64c7c6ce89b826e927` |
| `planets/venus.jpg` | [PIA23791](https://images.nasa.gov/details/PIA23791) | Venus from Mariner 10 (left panel) | NASA/JPL-Caltech | 2020-06-08 | 1024×1000, 34 KB | `853268f7922ea572a0966df4a378e6b54221102d6740bdc78f4011708ee71007` |
| `planets/mars.jpg` | [PIA00407](https://images.nasa.gov/details/PIA00407) | Global Color Views of Mars (Viking) | NASA/JPL/USGS | 1998-06-08 | 1024×1024, 135 KB | `076d0be8f7cf603f05e8b7281709400d9d39f21c6f615e8e385b8dfffc9bafdd` |
| `planets/jupiter.jpg` | [PIA02873](https://images.nasa.gov/details/PIA02873) | High Resolution Globe of Jupiter (Cassini) | NASA/JPL/University of Arizona | 2001-01-30 | 1024×576, 29 KB | `2b754a3a2566400da1bb268e98d087dd42a4b04bfe9374db090886d8e959f133` |
| `planets/saturn.jpg` | [PIA11141](https://images.nasa.gov/details/PIA11141) | Saturn … Four Years On (Cassini) | NASA/JPL/Space Science Institute | 2008-12-30 | 1024×496, 19 KB | `f612f0f92714a7beff22975367f41c3c9978d91358f70f997cb3e40b8f056870` |

The Mercury image is MESSENGER's enhanced-colour mosaic, in which colour
differences between surface materials are exaggerated; the caption in the app
names it as such. Sun, Moon, Uranus and Neptune are not shipped: only the five
naked-eye planets have rows in the app today (WI-033a, PLAN.md).

Chart data for the Constellations view has its own attribution in
`charts/ATTRIBUTION.md`.
