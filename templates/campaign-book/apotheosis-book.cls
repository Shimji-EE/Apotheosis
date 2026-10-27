%% apotheosis-book.cls
%% A clean, minimalist dark fantasy class for full campaign books.
%%
%% Carries over the features of the Dragonbane Supplement class
%% (parts with art, segments, dragon/demon/empty/table boxes, coloured list
%% items, accent colours, credits title page, black & white printing) and the
%% D&D 5e LaTeX template (read-aloud text, sidebars, rollable tables, stat
%% blocks, spell headers, drop caps, keyed areas), restyled for dark pages and
%% with art that fades into the page instead of sitting in a frame.
%%
%% Compile with XeLaTeX or LuaLaTeX (fontspec). All fonts ship with TeX Live.
%%
%% This work may be distributed and/or modified under the conditions of the
%% LaTeX Project Public License, version 1.3c or later.

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{apotheosis-book}[2026/10/27 v1.0 Minimalist dark fantasy campaign book]

%% ========================================================================
%% OPTIONS
%% ========================================================================
%   dark (default)  bone text on near-black pages, Cinzel titles
%   vermis          aged gamebook paper, coral titles, rounded panels
%                   (after Plastiboo's Vermis)
%   light           ink on warm parchment-coloured pages
%   print           ink on white, no textures (printer friendly)
%   blackwhite      alias of print, kept for Dragonbane compatibility
%   a4paper / letterpaper (default)
\def\apo@theme{dark}
\def\apo@paper{letterpaper}
\DeclareOption{dark}{\def\apo@theme{dark}}
\DeclareOption{vermis}{\def\apo@theme{vermis}}
\DeclareOption{light}{\def\apo@theme{light}}
\DeclareOption{print}{\def\apo@theme{print}}
\DeclareOption{blackwhite}{\def\apo@theme{print}}
\DeclareOption{a4paper}{\def\apo@paper{a4paper}}
\DeclareOption{letterpaper}{\def\apo@paper{letterpaper}}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{book}}
\ProcessOptions\relax
\LoadClass[10pt,twoside,openany]{book}
\def\apo@dark{dark}\def\apo@vermis{vermis}\def\apo@light{light}\def\apo@print{print}

%% ========================================================================
%% PACKAGES
%% ========================================================================
\RequirePackage{iftex}
\ifTUTeX\else
  \ClassError{apotheosis-book}{Compile with XeLaTeX or LuaLaTeX}
    {This class uses fontspec. Switch the compiler to XeLaTeX.}
\fi
\RequirePackage[\apo@paper,
  top=0.8in, bottom=0.95in, inner=0.7in, outer=0.7in,
  headsep=0pt, headheight=0pt, footskip=0.5in]{geometry}
\RequirePackage[english]{babel}
\RequirePackage[autostyle]{csquotes}
\RequirePackage{fontspec}
\RequirePackage{microtype}
\RequirePackage[table,dvipsnames]{xcolor}
\RequirePackage{graphicx}
\RequirePackage{tikz}
\usetikzlibrary{fadings,calc}
\RequirePackage[most]{tcolorbox}
\RequirePackage{multicol}
\RequirePackage{enumitem}
\RequirePackage{tabularx,array}
\RequirePackage{xstring}
\RequirePackage{titlesec,titletoc}
\RequirePackage{fancyhdr}
\RequirePackage{lettrine}
\RequirePackage{pagecolor}
\RequirePackage[hidelinks]{hyperref}

\setlength{\columnsep}{0.3in}
\setlength{\parindent}{1em}
\setlength{\parskip}{0pt}
\raggedbottom

%% ========================================================================
%% FONTS
%% ========================================================================
% dark / light / print: Crimson Pro body, Cinzel titles, Alegreya Sans labels.
% vermis: IM Fell English body (rough old print), Kooper titles (soft
% 70s gamebook serif), Alegreya Sans labels.
\ifx\apo@theme\apo@vermis
  \setmainfont{IMFeENrm28P.otf}[
    ItalicFont = IMFeENit28P.otf, SmallCapsFont = IMFeENsc28P.otf,
    BoldFont = IMFeENrm28P.otf, BoldFeatures = {FakeBold=2.2},
    BoldItalicFont = IMFeENit28P.otf, BoldItalicFeatures = {FakeBold=2.2},
    Scale = 1.06]
  \newfontfamily\displayfont{QTKooper.otf}[
    ItalicFont = QTKooper-Italic.otf, BoldFont = QTKooper.otf]
  \newfontfamily\decorfont{QTKooper.otf}
\else
  \setmainfont{CrimsonPro}[
    Extension = .ttf, UprightFont = *-Regular, BoldFont = *-SemiBold,
    ItalicFont = *-Italic, BoldItalicFont = *-SemiBoldItalic]
  \newfontfamily\displayfont{Cinzel}[
    Extension = .ttf, UprightFont = *-Regular, BoldFont = *-Bold]
  \newfontfamily\decorfont{CinzelDecorative}[
    Extension = .ttf, UprightFont = *-Regular, BoldFont = *-Bold]
\fi
\setsansfont{AlegreyaSans}[
  Extension = .otf, UprightFont = *-Regular, BoldFont = *-Bold,
  ItalicFont = *-Italic, BoldItalicFont = *-BoldItalic,
  SmallCapsFont = AlegreyaSansSC-Regular.otf]
% Spaced capitals for small labels ("CHAPTER ONE", running feet, ...)
\newcommand{\labelfont}{\sffamily\addfontfeatures{LetterSpace=18}}
\newcommand{\spaced}[1]{{\addfontfeatures{LetterSpace=18}\MakeUppercase{#1}}}
% Dragonbane compatibility
\newcommand{\titlefont}{\displayfont}
\newcommand{\tffamily}{\displayfont}

%% ========================================================================
%% COLOURS & THEME
%% ========================================================================
% Named accents. Pick one per part with \partcolor{<name>} or \setaccent{<name>}.
% Ember/Coral, Bile and Mustard are lifted from the Vermis palette.
\definecolor{Coral}{HTML}{E0533F}
\newcommand{\apo@palette}[8]{%
  \definecolor{Ember}{HTML}{#1}\definecolor{Ochre}{HTML}{#2}%
  \definecolor{Blood}{HTML}{#3}\definecolor{Bile}{HTML}{#4}%
  \definecolor{Mustard}{HTML}{#5}\definecolor{Frost}{HTML}{#6}%
  \definecolor{Amethyst}{HTML}{#7}\definecolor{Lyrium}{HTML}{#8}}
%   page ground, page centre, ink, muted, box ground, table row
\newcommand{\apo@grounds}[6]{%
  \definecolor{pageground}{HTML}{#1}\definecolor{pagecentre}{HTML}{#2}%
  \definecolor{ink}{HTML}{#3}\definecolor{muted}{HTML}{#4}%
  \definecolor{boxground}{HTML}{#5}\definecolor{rowground}{HTML}{#6}}
\newlength{\apo@arc}
\def\apo@texture{}
\ifx\apo@theme\apo@dark
  \apo@palette{C4573F}{B8975A}{A8382F}{9EA35A}{C9A23F}{7C9AB0}{9A7DB8}{C0453A}
  \apo@grounds{121110}{1B1917}{DCD3C2}{8E8678}{1E1C19}{211F1B}
  \colorlet{accent}{Ember}
  \def\apo@texture{art/texture-dark.jpg}
\fi
\ifx\apo@theme\apo@vermis
  \apo@palette{D2492F}{9C7424}{A3271B}{6F8E33}{C99A1E}{3F6F8C}{6B4C8A}{C23A2C}
  \apo@grounds{D9BB85}{ECDDB5}{2A1F17}{6E5B44}{23211D}{E2CD9C}
  \colorlet{accent}{Coral}
  \setlength{\apo@arc}{5pt}
  \def\apo@texture{art/texture-vermis.jpg}
\fi
\ifx\apo@theme\apo@light
  \apo@palette{9A3A26}{7D5F22}{7E1F17}{5E6324}{8A6A12}{34546B}{5A3F78}{8E2219}
  \apo@grounds{E9E1D0}{F1EBDF}{221E1A}{6B6256}{DFD5C1}{E0D7C4}
  \colorlet{accent}{Ember}
\fi
\ifx\apo@theme\apo@print
  \apo@palette{9A3A26}{7D5F22}{7E1F17}{5E6324}{8A6A12}{34546B}{5A3F78}{8E2219}
  \apo@grounds{FFFFFF}{FFFFFF}{1A1A1A}{5E5E5E}{F0EEEA}{F3F1ED}
  \colorlet{accent}{Ember}
\fi
% Text colour inside the dark panels used by the vermis theme.
\ifx\apo@theme\apo@vermis
  \definecolor{panelink}{HTML}{EADBB4}\else\colorlet{panelink}{ink}\fi
\colorlet{secret}{Blood}
\newcommand{\setaccent}[1]{\colorlet{accent}{#1}}
% Dragonbane: change the accent colour, starting on a new page.
\newcommand{\partcolor}[1]{\clearpage\setaccent{#1}}
\pagecolor{pageground}
\AtBeginDocument{\color{ink}}

%% ========================================================================
%% PAGE GROUND
%% ========================================================================
% Every page gets a texture (grain for dark, aged paper for vermis) or a soft
% radial lift. Art drawn with the commands below sits on top of it and fades
% into it with real transparency, so the texture shows through.
\newcommand{\apo@pageground}{%
  \put(0,0){\begin{tikzpicture}[overlay]
    \fill[pageground] (0,0) rectangle (\paperwidth,-\paperheight);
    \ifx\apo@theme\apo@print\else
      \ifx\apo@texture\@empty
        \shade[inner color=pagecentre, outer color=pageground]
          (0.5\paperwidth,-0.5\paperheight) ellipse
          [x radius=0.75\paperwidth, y radius=0.62\paperheight];
      \else
        \node[inner sep=0pt, anchor=north west] at (0,0)
          {\includegraphics[width=\paperwidth,height=\paperheight]{\apo@texture}};
      \fi
    \fi
  \end{tikzpicture}}}
\AddToHook{shipout/background}{\apo@pageground}

%% ========================================================================
%% FADED ART
%% ========================================================================
% \fadedart[keys]{file} draws an image cropped to width x height whose edges
% dissolve into whatever is behind it, like the art in the official books.
%
%   width=<len>        default \linewidth
%   height=<len>       default: keep the image's aspect ratio
%   fade=all|soft|bottom|top|sides|left|right|none   preset (default soft)
%   top/bottom/left/right=<0..0.5>   fade depth as a fraction of the size
%   focus=<0..1>       vertical crop focus: 0 top, .5 centre, 1 bottom
%   opacity=<0..1>     overall strength (default 1)
\pgfdeclareverticalshading{apo@edge}{100bp}{%
  color(0bp)=(white); color(25bp)=(white);
  color(37.5bp)=(black!16); color(50bp)=(black!50);
  color(62.5bp)=(black!84); color(75bp)=(black); color(100bp)=(black)}
\pgfkeys{/apo/art/.is family, /apo/art,
  width/.store in=\apo@aw, height/.store in=\apo@ah,
  top/.store in=\apo@ft, bottom/.store in=\apo@fb,
  left/.store in=\apo@fl, right/.store in=\apo@fr,
  focus/.store in=\apo@focus, opacity/.store in=\apo@aop,
  fade/.is choice,
  fade/none/.style   ={top=0, bottom=0, left=0, right=0},
  fade/soft/.style   ={top=.16, bottom=.2, left=.16, right=.16},
  fade/all/.style    ={top=.28, bottom=.3, left=.28, right=.28},
  fade/bottom/.style ={top=0, bottom=.5, left=0, right=0},
  fade/top/.style    ={top=.5, bottom=0, left=0, right=0},
  fade/sides/.style  ={top=0, bottom=0, left=.25, right=.25},
  fade/left/.style   ={top=.12, bottom=.16, left=.45, right=0},
  fade/right/.style  ={top=.12, bottom=.16, left=0, right=.45},
  reset/.style={width=\linewidth, height=, fade=soft, focus=.5, opacity=1},
}
% Build (once) a 10cm x 10cm soft mask for a given set of edge depths.
\newcommand{\apo@makefading}[1]{%
  \ifcsname apo@fading@#1\endcsname\else
    \expandafter\gdef\csname apo@fading@#1\endcsname{}%
    \begin{tikzfadingfrompicture}[name=#1]
      \fill[white] (-5cm,-5cm) rectangle (5cm,5cm);
      \begin{scope}[blend mode=multiply]
        \ifdim\apo@ft pt>0pt
          \shade[shading=apo@edge] (-5cm,5cm) rectangle (5cm,{5cm-10cm*\apo@ft});\fi
        \ifdim\apo@fb pt>0pt
          \shade[shading=apo@edge,shading angle=180] (-5cm,-5cm) rectangle (5cm,{-5cm+10cm*\apo@fb});\fi
        \ifdim\apo@fl pt>0pt
          \shade[shading=apo@edge,shading angle=90] (-5cm,-5cm) rectangle ({-5cm+10cm*\apo@fl},5cm);\fi
        \ifdim\apo@fr pt>0pt
          \shade[shading=apo@edge,shading angle=270] ({5cm-10cm*\apo@fr},-5cm) rectangle (5cm,5cm);\fi
      \end{scope}
    \end{tikzfadingfrompicture}%
  \fi}
\newsavebox{\apo@artbox}
\newlength{\apo@W}\newlength{\apo@H}
\NewDocumentCommand{\fadedart}{O{} m}{%
  \begingroup
  \pgfkeys{/apo/art/.cd, reset,#1}%
  \sbox\apo@artbox{\includegraphics{#2}}%
  \setlength{\apo@W}{\apo@aw}%
  \ifx\apo@ah\@empty
    \setlength{\apo@H}{\dimexpr\apo@W*\ht\apo@artbox/\wd\apo@artbox\relax}%
  \else
    \setlength{\apo@H}{\apo@ah}%
  \fi
  % Scale to cover the box, then crop.
  \pgfmathsetmacro{\apo@sc}{max(\apo@W/\wd\apo@artbox, \apo@H/\ht\apo@artbox)}%
  \pgfmathsetmacro{\apo@iw}{\wd\apo@artbox*\apo@sc}%
  \pgfmathsetmacro{\apo@ih}{\ht\apo@artbox*\apo@sc}%
  \pgfmathsetmacro{\apo@dy}{(\apo@ih-\apo@H)*(\apo@focus-.5)}%
  \edef\apo@fname{apofade-\apo@ft-\apo@fb-\apo@fl-\apo@fr}%
  \expandafter\apo@makefading\expandafter{\apo@fname}%
  \begin{tikzpicture}[inner sep=0pt]
    \useasboundingbox (0,0) rectangle (\apo@W,\apo@H);
    \begin{pgfscope}
      \pgfsetfading{\apo@fname}{%
        \pgftransformshift{\pgfpoint{.5\apo@W}{.5\apo@H}}%
        \pgftransformxscale{\apo@W/10cm}\pgftransformyscale{\apo@H/10cm}}%
      \pgfsetfillopacity{\apo@aop}%
      % A transparency group, so PNGs with their own alpha still fade.
      \begin{pgftransparencygroup}
        \pgfpathrectangle{\pgfpointorigin}{\pgfpoint{\apo@W}{\apo@H}}%
        \pgfusepath{clip}%
        \pgftext[at={\pgfpoint{.5\apo@W}{.5\apo@H+\apo@dy pt}}]{%
          \includegraphics[width=\apo@iw pt,height=\apo@ih pt]{#2}}%
      \end{pgftransparencygroup}
    \end{pgfscope}
  \end{tikzpicture}%
  \endgroup}

% In-column art. Soft edges on all sides; takes the same keys.
\NewDocumentCommand{\columnart}{O{} m}{%
  \par\vspace{6pt}\noindent\fadedart[#1]{#2}\par\vspace{6pt}}
% Dragonbane name
\let\spotart\columnart

% Art painted directly onto the page, behind the text.
%  \pagetopart[keys]{file}     full-bleed band across the top, fades down
%  \pagebottomart[keys]{file}  full-bleed band across the bottom, fades up
% Both apply to the page being typeset when the next page is shipped out,
% so call them at the top of the page they belong to.
\NewDocumentCommand{\pagetopart}{O{} m}{%
  \sbox\apo@artbox{\fadedart[width=\paperwidth, top=.04, bottom=.6, left=.04, right=.04, height=.42\paperheight, #1]{#2}}%
  \apo@placeart{top}}
\NewDocumentCommand{\pagebottomart}{O{} m}{%
  \sbox\apo@artbox{\fadedart[width=\paperwidth, fade=top, height=.3\paperheight, #1]{#2}}%
  \apo@placeart{bottom}}
% Keep each placed art in its own box until its page ships, then paint it
% anchored to the top or bottom edge of the paper.
\newcount\apo@artcount
\newcommand{\apo@placeart}[1]{%
  \global\advance\apo@artcount\@ne
  \expandafter\newsavebox\csname apo@art@\the\apo@artcount\endcsname
  \expandafter\global\expandafter\setbox\csname apo@art@\the\apo@artcount\endcsname
    =\copy\apo@artbox
  \edef\apo@tmp{\noexpand\AddToHookNext{shipout/background}%
    {\noexpand\apo@putart{#1}{\the\apo@artcount}}}%
  \apo@tmp}
\newcommand{\apo@putart}[2]{%
  \def\apo@tmpa{#1}\def\apo@tmpb{top}%
  \ifx\apo@tmpa\apo@tmpb
    \put(0,0){\raisebox{-\height}{\expandafter\usebox\csname apo@art@#2\endcsname}}%
  \else
    \put(0,-\paperheight){\expandafter\usebox\csname apo@art@#2\endcsname}%
  \fi}

% A page that is only art, full bleed, with a soft vignette and an optional
% caption set low on the page.
\NewDocumentCommand{\fullpageart}{O{} m o}{%
  \clearpage\thispagestyle{empty}%
  \sbox\apo@artbox{\fadedart[width=\paperwidth, height=\paperheight,
    top=.1, bottom=.22, left=.1, right=.1, #1]{#2}}%
  \apo@placeart{bottom}
  \null\vfill
  \IfValueT{#3}{\begin{center}\color{ink}\itshape\large #3\end{center}}%
  \vspace*{0.2in}\clearpage}

%% ========================================================================
%% ORNAMENTS
%% ========================================================================
\tikzfading[name=apo@in,  left color=transparent!100, right color=transparent!0]
\tikzfading[name=apo@out, left color=transparent!0,   right color=transparent!100]
\newcommand{\apo@diamond}[1][2.2pt]{%
  \tikz[baseline=-0.6ex]\fill[accent] (0,#1)--(#1,0)--(0,-#1)--(-#1,0)--cycle;}
% A hairline that fades out at both ends, with a diamond in the middle.
\newcommand{\ornament}[1][0.55\linewidth]{%
  \begin{tikzpicture}[baseline=-0.6ex]
    \fill[accent, path fading=apo@in]  (-0.5*#1,-0.3pt) rectangle (-5pt,0.3pt);
    \fill[accent, path fading=apo@out] (5pt,-0.3pt) rectangle (0.5*#1,0.3pt);
    \fill[accent] (0,2.2pt)--(2.2pt,0)--(0,-2.2pt)--(-2.2pt,0)--cycle;
  \end{tikzpicture}}
% A hairline that fades out to the right (under section titles).
% (vermis: a printed double rule instead.)
\ifx\apo@theme\apo@vermis
  \newcommand{\fadeline}[1][\linewidth]{%
    \tikz{\fill[accent] (0,0) rectangle (#1,1pt);
          \fill[accent] (0,-2pt) rectangle (#1,-1.5pt);}}
\else
  \newcommand{\fadeline}[1][\linewidth]{%
    \tikz\fill[accent, path fading=apo@out] (0,-0.25pt) rectangle (#1,0.25pt);}
\fi
\newcommand{\divider}{\par\medskip{\centering\ornament\par}\medskip}
% Dragonbane helpers
\newcommand*{\hrulefil}{\leavevmode\leaders\hrule height 0.7ex depth \dimexpr0.4pt-0.7ex\hfill\kern0pt}
\newcommand*{\bline}{\noalign{\color{accent}\hrule height 0.6pt}}

%% ========================================================================
%% HEADINGS
%% ========================================================================
\setcounter{secnumdepth}{0}
\setcounter{tocdepth}{1}
\newcommand{\thechapterhead}{\chaptername~\thechapter}

% --- Chapters ----------------------------------------------------------
% \chapterart[keys]{file} before \chapter paints art across the top of the
% opening page; the title then sits in the faded lower edge of the art.
\newif\ifapo@chapterart
\def\apo@chapterartfile{}\def\apo@chapterartkeys{}
\NewDocumentCommand{\chapterart}{O{} m}{%
  \gdef\apo@chapterartkeys{#1}\gdef\apo@chapterartfile{#2}\global\apo@chapterarttrue}
\newlength{\apo@chartheight}
\setlength{\apo@chartheight}{0.46\paperheight}
\newcommand{\apo@chapteropening}{%
  \ifapo@chapterart
    \edef\apo@tmp{\noexpand\pagetopart[height=\noexpand\apo@chartheight,
      \unexpanded\expandafter{\apo@chapterartkeys}]{\unexpanded\expandafter{\apo@chapterartfile}}}%
    \apo@tmp
    \vspace*{\dimexpr\apo@chartheight-0.8in-0.45in\relax}%
    \global\apo@chapterartfalse
  \else
    \vspace*{0.6in}%
  \fi}
\titleformat{\chapter}[display]
  {\apo@chapteropening\centering}
  {\labelfont\footnotesize\color{accent}\MakeUppercase{\thechapterhead}}
  {6pt}
  {\displayfont\fontsize{30}{34}\selectfont\color{ink}}
  [{\vspace{6pt}\ornament[0.5\textwidth]}]
\titleformat{name=\chapter,numberless}[display]
  {\apo@chapteropening\centering}{}{0pt}
  {\displayfont\fontsize{30}{34}\selectfont\color{ink}}
  [{\vspace{6pt}\ornament[0.5\textwidth]}]
\titlespacing*{\chapter}{0pt}{0pt}{0.35in}

% --- Sections ----------------------------------------------------------
% Title with a hairline set tight underneath.
\newcommand{\apo@ruledtitle}[1]{#1\par\nointerlineskip\vspace{3pt}\noindent\fadeline\par}
\titleformat{\section}
  {\displayfont\fontsize{17}{20}\selectfont\color{accent}\raggedright}
  {}{0pt}{\apo@ruledtitle}
\titlespacing*{\section}{0pt}{14pt plus 4pt}{6pt}

\titleformat{\subsection}
  {\displayfont\bfseries\fontsize{12.5}{15}\selectfont\color{ink}\raggedright}
  {}{0pt}{}
\titlespacing*{\subsection}{0pt}{10pt plus 3pt}{3pt}

\titleformat{\subsubsection}
  {\sffamily\bfseries\small\color{accent}\addfontfeatures{LetterSpace=10}\raggedright}
  {}{0pt}{\MakeUppercase}
\titlespacing*{\subsubsection}{0pt}{8pt plus 2pt}{2pt}

\titleformat{\paragraph}[runin]
  {\bfseries\itshape\color{ink}}{}{0pt}{}
\titlespacing*{\paragraph}{0pt}{4pt}{0.5em}

% --- Parts ---------------------------------------------------------------
% \partimage{file} sets full-bleed art for the next \part page.
\def\apo@partimage{}
\newcommand{\partimage}[1]{\gdef\apo@partimage{#1}}
\RenewDocumentCommand{\part}{s m}{%
  \clearpage\thispagestyle{empty}%
  \IfBooleanF{#1}{\refstepcounter{part}\addcontentsline{toc}{part}{#2}}%
  \ifx\apo@partimage\@empty\else
    \sbox\apo@artbox{\fadedart[width=\paperwidth, height=\paperheight,
      top=.08, bottom=.5, left=.08, right=.08, focus=.35]{\apo@partimage}}%
    \apo@placeart{bottom}
    \gdef\apo@partimage{}%
  \fi
  \null\vfill
  \begin{center}
    \IfBooleanF{#1}{{\labelfont\small\color{accent}\MakeUppercase{\partname~\thepart}\par}\vspace{8pt}}%
    {\displayfont\fontsize{40}{46}\selectfont\color{ink}#2\par}
    \vspace{10pt}\ornament[0.45\textwidth]
  \end{center}
  \vspace*{0.5in}
  \clearpage}

%% ========================================================================
%% TABLE OF CONTENTS
%% ========================================================================
\renewcommand{\contentsname}{Contents}
\titlecontents{part}[0pt]
  {\addvspace{14pt}\centering\displayfont\color{accent}}
  {}{}{}[\addvspace{4pt}]
\titlecontents{chapter}[0pt]
  {\addvspace{6pt}\displayfont\color{ink}}
  {}{}{\hfill\color{accent}\contentspage}
\titlecontents{section}[1.2em]
  {\itshape\color{muted}}
  {}{}{\titlerule*[0.6pc]{.}\color{muted}\contentspage}

%% ========================================================================
%% RUNNING FEET
%% ========================================================================
% Minimal: the page number at the outer corner, the chapter on odd pages,
% the book's title on even pages. No header.
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\chaptermark}[1]{\markboth{#1}{#1}}
\fancyfoot[LE]{\apo@folio{\thepage}\hspace{10pt}{\labelfont\scriptsize\color{muted}\MakeUppercase{\@title}}}
\fancyfoot[RO]{{\labelfont\scriptsize\color{muted}\MakeUppercase{\leftmark}}\hspace{10pt}\apo@folio{\thepage}}
\newcommand{\apo@folio}[1]{{\displayfont\color{accent}#1}}
\fancypagestyle{plain}{\fancyhf{}\fancyfoot[C]{\apo@folio{\thepage}}}

%% ========================================================================
%% TITLE PAGE & CREDITS
%% ========================================================================
\def\@subtitle{}\def\@credits{}\def\@version{}\def\apo@cover{}
\newcommand{\subtitle}[1]{\gdef\@subtitle{#1}}
\newcommand{\credits}[1]{\gdef\@credits{#1}}
\newcommand{\version}[1]{\gdef\@version{#1}}
\newcommand{\coverimage}[1]{\gdef\apo@cover{#1}}
\newcommand{\authorkey}{Written by}
\newcommand{\creditskey}{Credits}

\renewcommand*{\maketitle}{%
  \begin{titlepage}
    \ifx\apo@cover\@empty\else
      \sbox\apo@artbox{\fadedart[width=\paperwidth, height=\paperheight,
        top=.06, bottom=.55, left=.05, right=.05, focus=.2]{\apo@cover}}%
      \apo@placeart{bottom}
    \fi
    \null\vfill
    \begin{center}
      {\displayfont\fontsize{56}{60}\selectfont\color{ink}\addfontfeatures{LetterSpace=6}\MakeUppercase{\@title}\par}
      \vspace{10pt}\ornament[0.6\textwidth]\par
      \ifx\@subtitle\@empty\else
        \vspace{10pt}{\Large\itshape\color{ink}\@subtitle\par}
      \fi
      \vspace{18pt}
      {\labelfont\small\color{muted}\MakeUppercase{\@author}\par}
      \ifx\@version\@empty\else
        \vspace{4pt}{\labelfont\scriptsize\color{muted}\MakeUppercase{Version \@version}\par}
      \fi
    \end{center}
    \vspace*{0.3in}
  \end{titlepage}}

% \makecredits: a quiet credits page (Dragonbane's title block, moved inside).
\newcommand{\makecredits}{%
  \clearpage\thispagestyle{empty}%
  \null\vfill
  \begin{center}\begin{minipage}{0.62\textwidth}\centering\small
    {\labelfont\scriptsize\color{accent}\MakeUppercase{\authorkey}\par}\vspace{3pt}
    \@author\par\vspace{12pt}
    \ifx\@credits\@empty\else
      {\labelfont\scriptsize\color{accent}\MakeUppercase{\creditskey}\par}\vspace{3pt}
      {\setlength{\parskip}{0.5em}\@credits\par}
    \fi
    \vspace{12pt}\ornament[0.5\linewidth]
  \end{minipage}\end{center}
  \vspace*{0.4in}\clearpage}

%% ========================================================================
%% LAYOUT: SEGMENTS
%% ========================================================================
% Dragonbane's two-column block with an optional spanning section title.
\newenvironment{segment}[1][]{%
  \begin{multicols}{2}[\ifx\relax#1\relax\else\section{#1}\fi]}%
  {\end{multicols}}
\setlength{\multicolsep}{6pt plus 2pt}

%% ========================================================================
%% TEXT ELEMENTS
%% ========================================================================
% --- Drop caps ---
\renewcommand{\LettrineFontHook}{\decorfont\color{accent}}
\setcounter{DefaultLines}{3}
\setlength{\DefaultFindent}{2pt}
\setlength{\DefaultNindent}{0.4em}
\renewcommand{\LettrineTextFont}{\scshape}
\NewDocumentCommand{\dropcap}{m m}{\lettrine{#1}{#2}}
\let\DndDropCapLine\dropcap

% --- Epigraph quote (Dragonbane's quote environment) ---
\renewenvironment{quote}
  {\par\medskip\begin{center}\begin{minipage}{0.86\linewidth}\centering
   \itshape\color{ink}\setlength{\parskip}{4pt}}
  {\par\vspace{2pt}\apo@diamond\end{minipage}\end{center}\medskip}
\newcommand{\quoteby}[1]{\par{\upshape\small\color{muted}--- #1}}

% --- Lists ---
\setlist[itemize]{noitemsep, topsep=4pt, leftmargin=1.2em,
  label={\raisebox{0.15ex}{\apo@diamond[1.7pt]}}}
\setlist[enumerate]{noitemsep, topsep=4pt, leftmargin=1.4em,
  label={\color{accent}\displayfont\arabic*.}}
\setlist[description]{font=\color{accent}\displayfont, topsep=4pt, itemsep=2pt, leftmargin=0pt}
\newcommand\bolditem[1]{\item \textbf{#1}}
\newcommand\coloritem[2][accent]{\item {\color{#1}\textbf{#2}}}
\newcommand\secretitem[1]{\item {\color{secret}\textbf{\itshape#1}}}

% --- Keyed areas (A1. Gatehouse) ---
\newcounter{area}\newcounter{subarea}[area]
\renewcommand{\thearea}{\@arabic\c@area}
\newcommand{\areaprefix}{}
\NewDocumentCommand{\area}{m}{%
  \refstepcounter{area}%
  \subsection{{\color{accent}\areaprefix\thearea.}~#1}}
\NewDocumentCommand{\subarea}{m}{%
  \refstepcounter{subarea}%
  \subsubsection{\areaprefix\thearea\alph{subarea}.~#1}}
\let\DndArea\area\let\DndSubArea\subarea

%% ========================================================================
%% BOXES
%% ========================================================================
% Each box has one look per theme family: hairline panels for dark / light /
% print, and Vermis-style rounded panels (coral frame, cream type on black)
% for vermis.
\tcbset{apo/base/.style={enhanced, breakable, boxrule=0pt,
  sharp corners, frame hidden,
  before skip=10pt plus 2pt, after skip=10pt plus 2pt,
  parbox=false, fontupper=\small, colupper=ink,
  before upper={\setlength{\parindent}{0pt}\setlength{\parskip}{4pt}}}}
\ifx\apo@theme\apo@vermis
  \tcbset{
    apo/vframe/.style={frame empty, arc=\apo@arc, boxrule=1.4pt,
      frame code={\path[draw=accent, line width=1.4pt, rounded corners=\apo@arc]
        ([xshift=.7pt,yshift=-.7pt]frame.north west) rectangle
        ([xshift=-.7pt,yshift=.7pt]frame.south east);},
      interior code={\path[fill=tcbcolback, rounded corners=\apo@arc]
        (frame.north west) rectangle (frame.south east);}},
    apo/readaloud/.style={colback=accent, colupper=panelink, apo/vframe,
      frame code={}},
    apo/panel/.style={colback=boxground, colupper=panelink, apo/vframe},
    apo/statblock/.style={colback=boxground, colupper=panelink, apo/vframe},
    apo/variant/.style={colback=Bile, colupper=panelink, apo/vframe, frame code={}},
  }
\else
  \tcbset{
    apo/readaloud/.style={colback=boxground, borderline west={1.2pt}{0pt}{accent}},
    apo/panel/.style={colback=boxground,
      borderline north={0.5pt}{0pt}{accent}, borderline south={0.5pt}{0pt}{accent},
      overlay unbroken and first={\fill[accent] ([yshift=2.4pt]frame.north)--
        ([xshift=2.4pt]frame.north)--([yshift=-2.4pt]frame.north)--
        ([xshift=-2.4pt]frame.north)--cycle;}},
    apo/statblock/.style={colback=boxground,
      borderline north={1.2pt}{0pt}{accent}, borderline south={1.2pt}{0pt}{accent}},
    apo/variant/.style={colback=accent!13!pageground,
      borderline north={1.2pt}{0pt}{accent}},
  }
\fi
% Labels inside panels: accent on dark/light, mustard-on-black for vermis.
\ifx\apo@theme\apo@vermis
  \colorlet{panelaccent}{Coral}\definecolor{panelmuted}{HTML}{B9A57C}
\else
  \colorlet{panelaccent}{accent}\colorlet{panelmuted}{muted}
\fi

% Read-aloud text.
\newtcolorbox{readaloud}[1][]{apo/base, apo/readaloud,
  left=10pt, right=9pt, top=7pt, bottom=7pt,
  fontupper=\itshape\normalsize,#1}

% Sidebar (Dragonbane's dragonbox / D&D sidebar).
\newtcolorbox{sidebar}[2][]{apo/base, apo/panel,
  left=10pt, right=10pt, top=10pt, bottom=8pt,
  title={#2}, detach title,
  before upper={\setlength{\parindent}{0pt}\setlength{\parskip}{4pt}%
    \colorlet{accent}{panelaccent}\colorlet{muted}{panelmuted}%
    {\centering\displayfont\normalsize\color{accent}\tcbtitle\par}\vspace{2pt}},
  #1}

% Variant rule (Dragonbane's demonbox): a washed panel for optional rules.
\newtcolorbox{variantrule}[2][]{apo/base, apo/variant,
  left=10pt, right=10pt, top=8pt, bottom=8pt,
  title={#2}, detach title,
  before upper={\setlength{\parindent}{0pt}\setlength{\parskip}{4pt}%
    {\labelfont\scriptsize\color{\ifx\apo@theme\apo@vermis panelink\else accent\fi}OPTIONAL RULE\par}%
    {\displayfont\normalsize\tcbtitle\par}\vspace{2pt}},
  #1}

% Note (Dragonbane's emptybox): no panel, title between two fading lines.
\newtcolorbox{note}[2][]{apo/base,
  colback=pageground, opacityback=0, left=0pt, right=0pt, top=0pt, bottom=2pt,
  title={#2}, detach title,
  before upper={\setlength{\parindent}{0pt}\setlength{\parskip}{4pt}%
    {\centering\ornament[0.25\linewidth]~{\displayfont\color{accent}\tcbtitle}~\ornament[0.25\linewidth]\par}\vspace{2pt}},
  #1}

% Dragonbane names
\newenvironment{dragonbox}[2][]{\begin{sidebar}[#1]{#2}}{\end{sidebar}}
\newenvironment{demonbox}[2][]{\begin{variantrule}[#1]{#2}}{\end{variantrule}}
\newenvironment{emptybox}[2][]{\begin{note}[#1]{#2}}{\end{note}}

%% ========================================================================
%% TABLES
%% ========================================================================
% \begin{rolltable}[Title]{colspec} ... \end{rolltable}
% Header row uses \colhead{...}; body rows are zebra striped.
\newcolumntype{L}{>{\raggedright\arraybackslash}X}
\newcolumntype{C}{>{\centering\arraybackslash}X}
\newcommand{\colhead}[1]{\leavevmode{\labelfont\scriptsize\color{accent}\MakeUppercase{#1}}}
\newcommand{\apo@tablestart}[1]{%
  \par\addvspace{8pt}\noindent
  \minipage{\linewidth}%
  \ifx\relax#1\relax\else{\displayfont\normalsize\color{accent}#1\par}\vspace{3pt}\fi
  \small\renewcommand{\arraystretch}{1.3}%
  \rowcolors{2}{rowground}{}}
\newcommand{\apo@tableend}{\endminipage\par\addvspace{8pt}}
\newenvironment{rolltable}[2][]
  {\apo@tablestart{#1}\tabularx{\linewidth}{@{\hspace{4pt}}#2@{\hspace{4pt}}}}
  {\endtabularx\apo@tableend}

% Dragonbane: \begin{tablebox}{Title} <any tabular> \end{tablebox}
\newenvironment{tablebox}[2][]
  {\begin{note}[#1]{#2}\centering\small\renewcommand{\arraystretch}{1.3}\rowcolors{2}{rowground}{}}
  {\end{note}}
\newenvironment{pagetable}[2][]
  {\par\begin{tablebox}[#1]{#2}}{\end{tablebox}}

%% ========================================================================
%% STAT BLOCKS
%% ========================================================================
% \begin{monster}{Name} \monstertype{Large monstrosity, unaligned}
%   \basics[...] \stats[...] \details[...]  actions...  \end{monster}
% The keys match the rpg-monster package used in the Apotheosis notes.
\newcommand\armorclassname{Armor Class}
\newcommand\hitpointsname{Hit Points}
\newcommand\speedname{Speed}
\newcommand\skillsname{Skills}
\newcommand\dimmname{Damage Immunities}
\newcommand\dvulname{Damage Vulnerabilities}
\newcommand\dresname{Damage Resistances}
\newcommand\cimmname{Condition Immunities}
\newcommand\savesname{Saving Throws}
\newcommand\sensesname{Senses}
\newcommand\languagesname{Languages}
\newcommand\challengename{Challenge}

\newtcolorbox{monster}[2][]{apo/base, apo/statblock,
  left=9pt, right=9pt, top=8pt, bottom=8pt,
  title={#2}, detach title,
  before upper={\setlength{\parindent}{0pt}\setlength{\parskip}{3pt}%
    \colorlet{accent}{panelaccent}\colorlet{muted}{panelmuted}%
    {\displayfont\Large\color{accent}\tcbtitle\par}},
  #1}
\newenvironment{monsterbox}[2][]{\begin{monster}[#1]{#2}}{\end{monster}}
\newcommand{\monstertype}[1]{{\itshape\color{muted}#1\par}\monsterrule}
\newcommand{\monsterrule}{\par\nointerlineskip\vspace{3pt}\noindent\fadeline\par\nointerlineskip\vspace{1pt}}
\let\rpghline\monsterrule
\let\dndline\monsterrule

\newcommand{\apo@attr}[2]{%
  \ifx#2\@empty\else
    \par\vspace{-2pt}\noindent\hangindent=1em{\color{accent}\textbf{#1}}~#2\par
  \fi}
\pgfkeys{/apo/mon/.is family, /apo/mon,
  armorclass/.store in=\apo@m@ac, hitpoints/.store in=\apo@m@hp,
  speed/.store in=\apo@m@sp,
  STR/.store in=\apo@m@str, DEX/.store in=\apo@m@dex, CON/.store in=\apo@m@con,
  INT/.store in=\apo@m@int, WIS/.store in=\apo@m@wis, CHA/.store in=\apo@m@cha,
  skills/.store in=\apo@m@skills, savingthrows/.store in=\apo@m@saves,
  damagevulnerabilities/.store in=\apo@m@dvul,
  damageresistances/.store in=\apo@m@dres,
  damageimmunities/.store in=\apo@m@dimm,
  conditionimmunities/.store in=\apo@m@cimm,
  senses/.store in=\apo@m@senses, languages/.store in=\apo@m@lang,
  challenge/.store in=\apo@m@cr}
\NewDocumentCommand{\basics}{O{}}{%
  \pgfkeys{/apo/mon/.cd, armorclass=, hitpoints=, speed=,#1}%
  \apo@attr{\armorclassname}{\apo@m@ac}%
  \apo@attr{\hitpointsname}{\apo@m@hp}%
  \apo@attr{\speedname}{\apo@m@sp}}
\NewDocumentCommand{\stats}{O{}}{%
  \pgfkeys{/apo/mon/.cd, STR=\stat{10}, DEX=\stat{10}, CON=\stat{10},
    INT=\stat{10}, WIS=\stat{10}, CHA=\stat{10},#1}%
  \par\vspace{2pt}\noindent
  {\setlength{\tabcolsep}{0pt}\footnotesize
   \begin{tabular*}{\linewidth}{@{\extracolsep{\fill}}cccccc@{}}
     \colhead{Str}&\colhead{Dex}&\colhead{Con}&\colhead{Int}&\colhead{Wis}&\colhead{Cha}\\
     \apo@m@str&\apo@m@dex&\apo@m@con&\apo@m@int&\apo@m@wis&\apo@m@cha
   \end{tabular*}}\par\vspace{2pt}}
\NewDocumentCommand{\details}{O{}}{%
  \pgfkeys{/apo/mon/.cd, skills=, savingthrows=, damagevulnerabilities=,
    damageresistances=, damageimmunities=, conditionimmunities=,
    senses=---, languages=---, challenge=,#1}%
  \apo@attr{\savesname}{\apo@m@saves}%
  \apo@attr{\skillsname}{\apo@m@skills}%
  \apo@attr{\dvulname}{\apo@m@dvul}%
  \apo@attr{\dresname}{\apo@m@dres}%
  \apo@attr{\dimmname}{\apo@m@dimm}%
  \apo@attr{\cimmname}{\apo@m@cimm}%
  \apo@attr{\sensesname}{\apo@m@senses}%
  \apo@attr{\languagesname}{\apo@m@lang}%
  \ifx\apo@m@cr\@empty\else
    \apo@attr{\challengename}{\crexp{\apo@m@cr}}\fi}

% Monster sections and actions
\newcommand{\monstersection}[1]{%
  \par\vspace{5pt}{\displayfont\color{accent}#1\par}\nointerlineskip\vspace{2pt}\noindent\fadeline\par\nointerlineskip\vspace{2pt}}
\let\rpgmonstersection\monstersection
\NewDocumentEnvironment{monsteraction}{o}
  {\par\IfValueT{#1}{\textbf{\itshape #1.}~}\ignorespaces}{\par}
\NewDocumentEnvironment{rpg-monsteraction}{o}
  {\par\IfValueT{#1}{\textbf{\itshape #1.}~}\ignorespaces}{\par}

% \stat{12} -> "12 (+1)"
\newcommand{\stat}[1]{%
  \edef\apo@mod{\fpeval{floor((#1-10)/2)}}%
  #1~(\ifnum\apo@mod<0 \textminus\the\numexpr-\apo@mod\relax\else +\apo@mod\fi)}
\providecommand{\textminus}{\ensuremath{-}}
% \rpgdice{2d6+3} -> "10 (2d6 + 3)"
\newcommand{\rpgdice}[1]{%
  \StrDel{#1}{ }[\apo@d]%
  \StrBefore{\apo@d}{d}[\apo@dn]%
  \StrBehind{\apo@d}{d}[\apo@ds]%
  \def\apo@dm{0}\def\apo@dmtxt{}%
  \IfSubStr{\apo@ds}{+}{%
    \StrBehind{\apo@ds}{+}[\apo@dm]\StrBefore{\apo@ds}{+}[\apo@ds]%
    \edef\apo@dmtxt{ + \apo@dm}}{%
  \IfSubStr{\apo@ds}{-}{%
    \StrBehind{\apo@ds}{-}[\apo@tmpm]\StrBefore{\apo@ds}{-}[\apo@ds]%
    \edef\apo@dm{-\apo@tmpm}\edef\apo@dmtxt{ \textminus{} \apo@tmpm}}{}}%
  \ifx\apo@dn\@empty\def\apo@dn{1}\fi
  \fpeval{floor(\apo@dn*(\apo@ds+1)/2)+(\apo@dm)}~(\apo@dn d\apo@ds\apo@dmtxt)}
\let\dice\rpgdice
% Challenge rating with XP
\newcommand\crexp[1]{%
  \IfStrEqCase{#1}{%
    {0}{0 (0 XP)}{1/8}{1/8 (25 XP)}{1/4}{1/4 (50 XP)}{1/2}{1/2 (100 XP)}%
    {1}{1 (200 XP)}{2}{2 (450 XP)}{3}{3 (700 XP)}{4}{4 (1,100 XP)}%
    {5}{5 (1,800 XP)}{6}{6 (2,300 XP)}{7}{7 (2,900 XP)}{8}{8 (3,900 XP)}%
    {9}{9 (5,000 XP)}{10}{10 (5,900 XP)}{11}{11 (7,200 XP)}{12}{12 (8,400 XP)}%
    {13}{13 (10,000 XP)}{14}{14 (11,500 XP)}{15}{15 (13,000 XP)}%
    {16}{16 (15,000 XP)}{17}{17 (18,000 XP)}{18}{18 (20,000 XP)}%
    {19}{19 (22,000 XP)}{20}{20 (25,000 XP)}{21}{21 (33,000 XP)}%
    {22}{22 (41,000 XP)}{23}{23 (50,000 XP)}{24}{24 (62,000 XP)}%
    {25}{25 (75,000 XP)}{26}{26 (90,000 XP)}{27}{27 (105,000 XP)}%
    {28}{28 (120,000 XP)}{29}{29 (135,000 XP)}{30}{30 (155,000 XP)}%
  }[#1]}

%% ========================================================================
%% SPELLS, AFFLICTIONS, ITEMS
%% ========================================================================
% \spellheader{Name}{Level & school}{Casting time}{Range}{Components}{Duration}
\newcommand{\apo@sline}[2]{\par\noindent{\color{accent}\textbf{#1:}}~#2}
\NewDocumentCommand{\spellheader}{m m m m m m}{%
  \par\addvspace{8pt}\noindent
  {\displayfont\large\color{accent}#1\par}
  {\itshape\color{muted}#2\par}\vspace{2pt}%
  \apo@sline{Casting Time}{#3}\apo@sline{Range}{#4}%
  \apo@sline{Components}{#5}\apo@sline{Duration}{#6}\par\vspace{4pt}}
\let\DndSpellHeader\spellheader
% \itemheader{Name}{Wondrous item, rare (requires attunement)}
\NewDocumentCommand{\itemheader}{m m}{%
  \par\addvspace{8pt}\noindent{\displayfont\large\color{accent}#1\par}
  {\itshape\color{muted}#2\par}\vspace{2pt}}
\let\DndItemHeader\itemheader

%% ========================================================================
%% D&D 5e TEMPLATE COMPATIBILITY
%% ========================================================================
% Lets existing notes written for dndbook move over with few edits.
\newenvironment{DndReadAloud}{\begin{readaloud}}{\end{readaloud}}
\newenvironment{DndSidebar}[2][]{\begin{sidebar}{#2}}{\end{sidebar}}
\newenvironment{DndComment}[2][]{\begin{sidebar}{#2}}{\end{sidebar}}
\newenvironment{DndTable}[2][]
  {\def\apo@dthead{}\pgfkeys{/apo/dndtable/.cd,#1}%
   \expandafter\apo@tablestart\expandafter{\apo@dthead}%
   \tabularx{\linewidth}{@{\hspace{4pt}}#2@{\hspace{4pt}}}}
  {\endtabularx\apo@tableend}
\pgfkeys{/apo/dndtable/.cd, header/.store in=\apo@dthead,
  color/.code={}, width/.code={}, float/.code={}}
\NewDocumentCommand{\DndSetThemeColor}{o}{\IfValueT{#1}{\@ifundefined{\string\color@#1}{}{\setaccent{#1}}}}

\endinput
