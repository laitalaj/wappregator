from wapprecommon import model

DIODI = model.Radio(
    id="diodi",
    name="Radio Diodi",
    url="https://radiodiodi.fi/",
    location="Otaniemi",
    wappu_locations=["TKK"],
    frequency_mhz=102,
    brand=model.Brand(
        background_color="rgb(231, 206, 108)",
        text_color="rgb(21, 61, 93)",
        contrast_color="rgb(198, 72, 90)",
    ),
    streams=[
        model.Stream(
            url="https://virta.radiodiodi.fi/flac",
            mime_type="audio/flac",
        ),
        model.Stream(
            url="https://virta.radiodiodi.fi/mp3",
            mime_type="audio/mpeg",
        ),
        model.Stream(
            url="https://virta.radiodiodi.fi/aac",
            mime_type="audio/aac",
        ),
    ],
    has_now_playing=True,
)

JKL = model.Radio(
    id="jkl",
    name="Vappuradio JKL",
    url="https://www.vappuradiojkl.net",
    location="Jyväskylä",
    wappu_locations=["Jyväääskylä"],
    brand=model.Brand(
        background_color="rgb(236, 0, 140)",
        text_color="white",
    ),
    streams=[
        model.Stream(
            url="https://jkl.hacklab.fi:8443/fm.opus",
            mime_type="audio/ogg",
        ),
        model.Stream(
            url="https://jkl.hacklab.fi:8443/fm.mp3",
            mime_type="audio/mpeg",
        ),
    ],
)

NORPPA = model.Radio(
    id="norppa",
    name="Norpparadio",
    url="https://norpparadio.net/",
    location="Lappeenranta",
    wappu_locations=["lappeen   Ranta"],
    brand=model.Brand(
        background_color="rgb(15, 23, 43)",
        text_color="white",
    ),
    streams=[
        model.Stream(
            url="https://norpparadio.net/manifests/master.m3u8",
            mime_type="application/x-mpegURL",
        ),
        model.Stream(
            url="https://listen.norpparadio.net:8443/norpparadio.mp3",
            mime_type="audio/mpeg",
        ),
        model.Stream(
            url="https://listen.norpparadio.net:8443/norpparadio.ogg",
            mime_type="audio/ogg",
        ),
    ],
)

RAKKAUDEN = model.Radio(
    id="rakkauden",
    name="Rakkauden Wappuradio",
    url="https://wappuradio.fi/",
    location="Tampere",
    wappu_locations=["Tanpere", "Manse", "Herwood"],
    frequency_mhz=101.6,
    brand=model.Brand(
        background_color="rgb(240, 255, 224)",
        text_color="rgb(82, 120, 20)",
    ),
    streams=[
        model.Stream(
            url="https://stream1.wappuradio.fi/wappuradio.opus",
            mime_type="audio/ogg",
        ),
        model.Stream(
            url="https://stream2.wappuradio.fi/wappuradio.opus",
            mime_type="audio/ogg",
        ),
        model.Stream(
            url="https://stream1.wappuradio.fi/wappuradio.ogg",
            mime_type="audio/ogg",
        ),
        model.Stream(
            url="https://stream2.wappuradio.fi/wappuradio.ogg",
            mime_type="audio/ogg",
        ),
        model.Stream(
            url="https://stream1.wappuradio.fi/wappuradio.mp3",
            mime_type="audio/mpeg",
        ),
        model.Stream(
            url="https://stream2.wappuradio.fi/wappuradio.mp3",
            mime_type="audio/mpeg",
        ),
    ],
    has_now_playing=True,
)

RATTO = model.Radio(
    id="ratto",
    name="Rattoradio",
    url="https://www.rattoradio.fi/",
    location="Oulu",
    wappu_locations=["Paska kaupunni"],
    frequency_mhz=91.6,
    brand=model.Brand(
        background_color="rgb(7, 118, 187)",
        text_color="white",
    ),
    streams=[
        model.Stream(
            url="https://stream.rattoradio.fi/ratto.mp3",
            mime_type="audio/mpeg",
        ),
    ],
    has_now_playing=True,
)

SATEILY = model.Radio(
    id="sateily",
    name="Radio Säteily",
    url="https://www.radiosateily.fi/",
    location="Rovaniemi",
    wappu_locations=["Lappi"],
    frequency_mhz=89,
    brand=model.Brand(
        background_color="rgb(72, 83, 139)",
        text_color="white",
        contrast_color="rgb(198, 180, 116)",
    ),
    streams=[
        model.Stream(
            url="https://streams.radio.co/sc2e7aecbe/listen",
            mime_type="audio/aac",
        ),
    ],
    # The domain doesn't exist as of 2026-03-07,
    # enable this when Säteily is back
    stream_check_enabled=False,
)

TURUN = model.Radio(
    id="turun",
    name="Turun Wappuradio",
    url="https://turunwappuradio.com/",
    location="Turku",
    wappu_locations=["Suomen Turku", "Turku Åbo"],
    frequency_mhz=93.8,
    brand=model.Brand(
        background_color="rgb(0, 51, 102)",
        text_color="white",
        contrast_color="rgb(238, 107, 96)",
    ),
    streams=[
        model.Stream(
            url="https://stream.turunwappuradio.com/twr_hifi.m3u8",
            # This means HLS
            mime_type="application/x-mpegURL",
        ),
    ],
    has_now_playing=True,
)

WAPINA = model.Radio(
    id="wapina",
    name="Radio Wapina",
    url="https://wapina.fi/",
    location="Vaasa",
    wappu_locations=["Wasalandia"],
    brand=model.Brand(
        background_color="rgb(255, 180, 20)",
        text_color="rgb(42, 44, 46)",
    ),
    streams=[
        # These URLs are identical for both streams - maybe the endpoint serves
        # different data depending on headers?
        model.Stream(
            url="https://s5.radio.co/s484b62a6d/listen",
            mime_type="audio/ogg",
        ),
        model.Stream(
            url="https://s5.radio.co/s484b62a6d/listen",
            mime_type="audio/mpeg",
        ),
    ],
)

ALL_RADIOS = [
    DIODI,
    JKL,
    NORPPA,
    RAKKAUDEN,
    RATTO,
    SATEILY,
    TURUN,
    WAPINA,
]
