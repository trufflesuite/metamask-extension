(async function () {
  const app = document.getElementById('app');
  const loader = document.querySelector('.loader');
  function log(message) {
    const child = document.createElement('div');
    child.innerHTML += message;
    app.appendChild(child);
  }
  let command;
  try {
    options = JSON.parse(unescape(document.location.search.replace(/^\?/, '')));
    const { providerOptions } = options;

    providerOptions.logging = {
      logger: {
        log,
      },
    };
    const contexts = new Map();
    const provider = Ganache.provider(providerOptions);
    await provider.request({ method: 'eth_subscribe', params: ['newHeads'] });
    await provider.request({ method: 'eth_subscribe', params: ['logs'] });
    provider.on('message', (response) => {
      log(JSON.stringify(response, null, 2));
    });
    // events stuff isn't working in browser :-()
    await new Promise((resolve) => setTimeout(resolve, 1000));
    provider.on('ganache:vm:tx:before', (event) => {
      contexts.set(event.context, []);
    });
    provider.on('ganache:vm:tx:step', (event) => {
      contexts.get(event.context).push(event.data);
      //const child = document.createElement("div");
      //console.log(event.data);
      //child.innerHTML += event.data.opcode.name;
      //app.appendChild(child);
      progress.innerHTML = 'Progress:' + event.data.opcode.name;
    });
    provider.on('ganache:vm:tx:after', (event) => {
      // console.log(contexts.get(event.context));
      contexts.delete(event.context);
    });
    loader.style.display = 'none';
    for (const [method, params] of options.commands) {
      loader.style.display = 'block';
      progress.innerHTML = '';
      const result = await provider.request({ method, params });
      log(JSON.stringify(result, null, 2));
      progress.innerHTML = '';
      loader.style.display = 'none';
    }
  } catch (e) {
    log('Error: ' + e.message);
  }
})();
