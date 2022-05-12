document.addEventListener('DOMContentLoaded', function () {
  const iframe = document.getElementById('clairvoyance-iframe');
  iframe.src = `${iframe.src}${decodeURI(window.location.search)}`;
});
