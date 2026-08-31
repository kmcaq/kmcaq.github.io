const components = [
  ["navbar", "components/navbar.html"],
  ["hero", "components/hero.html"],
  ["links", "components/links.html"],
  ["gameshelf", "components/gameshelf.html"],
  ["schedule", "components/schedule.html"]
];

async function loadComponents() {

  await Promise.all(

    components.map(async ([id, file]) => {

      const html = await fetch(file, { cache: "no-cache" })
        .then(r => r.text());

      document.getElementById(id).innerHTML = html;

    })

  );

  if (window.initLive) initLive();
  if (window.initNavbar) initNavbar();
  if (window.initGameshelf) initGameshelf();

}

loadComponents();
