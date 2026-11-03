# pin-grab

Downloads every image on a Pinterest board into a folder, with an
`index.html` contact sheet, so the art can be used as reference.

It runs on your own computer: Pinterest refuses requests from servers.

## Use

Windows: double-click `pin-grab.bat` and paste the board link.

Anywhere else:

```sh
python -m pip install gallery-dl
python pin_grab.py https://pin.it/1okTtMLvv
```

The images land in `art-inspo/<user>-<board>/`. If Pinterest says the board
can't be found, the board or the whole profile is private: add
`--cookies-from firefox` so it uses your logged-in Firefox session. Chrome
locks its cookies against outside tools, so its login can't be borrowed. `--out <folder>` changes where they go.

To share them with Claude, zip the board folder and upload it in the project.
