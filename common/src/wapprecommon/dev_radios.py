"""Dev station definitions for testing when real wappuradios aren't broadcasting."""

from wapprecommon import model

BOSSA = model.Radio(
    id="somafm_bossa",
    name="SomaFM: Bossa Beyond",
    url="https://somafm.com/bossa/",
    location="San Francisco, CA",
    brand=model.Brand(
        background_color="rgb(78, 54, 41)",
        text_color="white",
    ),
    streams=[
        model.Stream(
            url="https://ice1.somafm.com/bossa-256-mp3",
            mime_type="audio/mpeg",
        ),
    ],
    has_now_playing=True,
)

GROOVESALAD = model.Radio(
    id="somafm_groovesalad",
    name="SomaFM: Groove Salad",
    url="https://somafm.com/groovesalad/",
    location="San Francisco, CA",
    brand=model.Brand(
        background_color="rgb(67, 97, 54)",
        text_color="white",
    ),
    streams=[
        model.Stream(
            url="https://ice1.somafm.com/groovesalad-256-mp3",
            mime_type="audio/mpeg",
        ),
    ],
    has_now_playing=True,
)

DEFCON = model.Radio(
    id="somafm_defcon",
    name="SomaFM: DEF CON Radio",
    url="https://somafm.com/defcon/",
    location="San Francisco, CA",
    brand=model.Brand(
        background_color="rgb(20, 20, 20)",
        text_color="rgb(0, 255, 0)",
    ),
    streams=[
        model.Stream(
            url="https://ice1.somafm.com/defcon-256-mp3",
            mime_type="audio/mpeg",
        ),
    ],
    has_now_playing=True,
)

VAPORWAVES = model.Radio(
    id="somafm_vaporwaves",
    name="SomaFM: Vaporwaves",
    url="https://somafm.com/vaporwaves/",
    location="San Francisco, CA",
    brand=model.Brand(
        background_color="rgb(120, 60, 150)",
        text_color="rgb(255, 200, 230)",
    ),
    streams=[
        model.Stream(
            url="https://ice1.somafm.com/vaporwaves-128-mp3",
            mime_type="audio/mpeg",
        ),
    ],
    has_now_playing=True,
)

ALL_DEV_RADIOS = [BOSSA, GROOVESALAD, DEFCON, VAPORWAVES]
