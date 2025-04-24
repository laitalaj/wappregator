from wapprecommon import model

DIODI = model.Radio(
    id="diodi",
    name="Radio Diodi",
    url="https://radiodiodi.fi/",
    location="Otaniemi",
    frequency_mhz=102,
    brand=model.Brand(
        background_color="rgb(220, 246, 220)",
        text_color="rgb(39, 83, 40)",
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
    location="Jyväääskylä",
    brand=model.Brand(
        background_color="rgb(43, 19, 75)",
        text_color="rgb(255, 255, 255)",
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
    location="lappeen Ranta",
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
    frequency_mhz=101.6,
    brand=model.Brand(
        background_color="rgb(211, 59, 111)",
        text_color="white",
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
)

SATEILY = model.Radio(
    id="sateily",
    name="Radio Säteily",
    url="https://www.radiosateily.fi/",
    location="Lappi",
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
)

TURUN = model.Radio(
    id="turun",
    name="Turun Wappuradio",
    url="https://turunwappuradio.com/",
    location="Suomen Turku",
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
    brand=model.Brand(
        background_color="rgb(255, 180, 20)",
        text_color="black",
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
