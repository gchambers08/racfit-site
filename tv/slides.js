/* ==========================================================================
   RacFit TV - slide list
   This is the only file you edit to change what plays on the TV.
   Live at:  https://goracfit.com/tv/

   HOW IT WORKS
   - Slides play top to bottom, then loop.
   - A slide only plays between its "start" and "end" dates (both optional,
     format "YYYY-MM-DD", inclusive). Every event slide has "end" set to the
     event date, so it drops off the TV by itself the day after.
   - Set  show: false  to park a slide without deleting it.
   - The TV checks for changes every 10 minutes, so after you publish an
     update it shows up on its own. Nobody has to touch the TV.

   SLIDE TYPES
   promo   Photo on the right, headline + details on the left.
   member  Member of the Month: big photo, name, short quote.
   image   One full-screen picture (a 16:9 graphic, or a flyer).
   video   One full-screen video. Plays muted, start to finish, then moves on.

   COMMON FIELDS
   seconds   How long the slide stays up (default 12). For video, a cap.
   theme     "navy" (default), "blue", "holiday", "tt" (Tennis & Tequila).

   PROMO FIELDS
   eyebrow   A name for the slide so it's easy to find here (not shown).
   headline  Big type. Use \n for a line break and [brackets] for the
             accent color, e.g. "Receive up to\n[$650 in club credits]".
   text      One short line under the headline (aim for under 8 words).
   chips     Dates, times and prices, shown big and bold,
             e.g. ["Dec 21-23", "8:30 AM - 4 PM"]. Keep each one short.
   photo     Image path. Site photos live in ../assets/img/ ; new ones go
             in media/ next to this file. Two photos in [ ] stack them.
   photoPos  Which part of the photo to keep, e.g. "30% center".
   photoFit  "cover" (default, fills the panel) or "contain" (whole image,
             good for logos and art).
   qr        Optional link drawn as a QR code (none of the current slides use one).
   cta       Big call to action next to the QR code.
   ctaSub    Small line under the call to action.
   logo      true adds the RacFit logo (off by default).
   side      Layouts alternate automatically (photo right, then left).
             Set "left" or "right" to force where the photo goes.
   effect    "balloons" adds balloons floating up over the photo.

   MEDIA TIPS
   - Photos: JPG, about 2000px wide, under 1 MB.
   - Video: MP4 (H.264), 1920x1080, no sound needed. Keep each file under
     25 MB - the web host will not serve anything larger.
   ========================================================================== */

window.RACFIT_TV = {
  defaultSeconds: 12,
  checkForUpdatesMinutes: 10,

  slides: [

    /* ---------------- Dated offers and events (auto-unpublish) ---------- */

    {
      type: "promo",
      end: "2026-12-31",
      eyebrow: "Fall Membership Special",
      headline: "Receive up to\n[$650 in]\n[club credits]",
      text: "Credit for lessons, programs & pro shop.",
      chips: ["Limited to 35 memberships"],
      photo: "../assets/img/racfit-tennis-pickleball-fitness-club-buda-tx.jpg",
      cta: "Join today!",
      ctaSub: "goracfit.com/membership"
    },

    {
      type: "promo",
      end: "2026-11-07",
      eyebrow: "Parent Workshop",
      headline: "Better sleep\n[for babies]",
      text: "6 proven sleep tips for babies 4 to 18 months.",
      chips: ["Sat, Nov 7", "11 AM - 12 PM", "Fitness Room 1", "$15 per family"],
      photo: "media/michelle-read.jpg",
      photoPos: "center 25%",
      cta: "Save your spot",
      ctaSub: "Register on Play by Point"
    },

    {
      type: "promo",
      end: "2026-11-13",
      eyebrow: "First Annual Pro-Am",
      headline: "HP Pro-Am\n[Tournament]",
      text: "HP juniors team up with a parent or adult.",
      chips: ["Nov 13", "7-9 PM", "$100 per team"],
      photo: "../assets/img/junior-high-performance-team-buda-tx.jpg",
      cta: "Sign up today",
      ctaSub: "Register on Play by Point"
    },

    {
      type: "promo",
      theme: "tt",
      end: "2026-11-14",
      eyebrow: "Free community festival",
      headline: "Saturday\n[November 14]",
      text: "Tennis. Spirits. Music. Games.",
      chips: ["4-8 PM", "Free to attend"],
      photo: "media/tennis-tequila.png",
      photoFit: "contain",
      cta: "Come play, hang out or both!",
      ctaSub: "Benefiting the RacFit Foundation"
    },

    {
      type: "image",
      end: "2026-11-21",
      src: "media/turkey-bowl.jpg"
    },

    {
      type: "promo",
      theme: "holiday",
      end: "2026-12-30",
      eyebrow: "Holiday Sports Camp",
      headline: "Holiday\n[Sports Camp]",
      text: "Full & half day options for kids.",
      chips: ["Dec 21-23", "Dec 28-30", "8:30 AM - 4 PM"],
      photo: "../assets/img/summer-sports-camp-group-buda-tx.jpg",
      cta: "Save their spot",
      ctaSub: "Register in the RacFit app"
    },

    /* ---------------- Always on --------------------------------------- */

    {
      type: "promo",
      eyebrow: "Corporate Events",
      headline: "Not another\n[conference room.]",
      text: "Team building, client events & holiday parties.",
      chips: ["12 to 300+ guests"],
      photo: "../assets/img/corporate-event-venue-buda-tx.jpg",
      cta: "Let's plan your event",
      ctaSub: "goracfit.com/corporate-events"
    },

    {
      type: "promo",
      theme: "blue",
      eyebrow: "Birthday Parties",
      effect: "balloons",
      headline: "The ultimate\n[birthday party.]",
      text: "Tennis, pickleball & digital sports with a party host.",
      chips: ["Ages 5+", "Up to 30 guests", "From $400"],
      photo: "../assets/img/junior-tennis-forehand-buda-tx.jpg",
      cta: "Book their party",
      ctaSub: "goracfit.com/birthday-parties"
    },

    {
      type: "promo",
      eyebrow: "RF Fitness",
      headline: "Assisted\n[Stretching]",
      text: "1-on-1 with coach Anthony Bushay.",
      photo: "media/assisted-stretch-legraise.jpg",
      photoPos: "0% center",
      cta: "Book a Pro",
      ctaSub: "In the RacFit app"
    },

    {
      type: "promo",
      eyebrow: "Performance Mobility Clinic",
      headline: "Move better.\n[Play stronger.]",
      text: "Conditioning for tennis & pickleball players.",
      chips: ["Fridays", "11 AM", "$20-25 per class"],
      photo: "media/mobility-clinic.jpg",
      photoPos: "0% center",
      cta: "Reserve in the app",
      ctaSub: "Led by Michael Carson"
    },

    {
      type: "promo",
      theme: "blue",
      eyebrow: "Tennis · Pickleball",
      headline: "Book a court\n[in seconds.]",
      text: "Reserve tennis & pickleball courts.",
      photo: "../assets/img/indoor-tennis-courts-buda-tx.jpg",
      cta: "Book in the app",
      ctaSub: "or at book.goracfit.com"
    }

    /* ---- Templates for later ---------------------------------------------
    ,{
      type: "member",
      month: "December 2026",
      name: "Member Name",
      detail: "Member since 2024 · Pickleball",
      quote: "A sentence or two from the member about what they love at RacFit.",
      photo: "media/member-photo.jpg"
    }
    ,{
      type: "image",
      src: "media/my-graphic.jpg",
      fit: "cover",          // "contain" shows the whole image, e.g. a flyer
      end: "2026-12-31",
      seconds: 10
    }
    --------------------------------------------------------------------- */

  ]
};
