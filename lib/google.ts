const buildPlaceDetailsEndpoint = (place_id: string) =>
  "https://maps.googleapis.com/maps/api/place/details/json?" +
  new URLSearchParams({ place_id, key: process.env.GMAPS_KEY || "" });

async function getPlaceDetails(place_id: string) {
  const url = buildPlaceDetailsEndpoint(place_id);
  try {
    return fetch(url)
      .then((res) => res.json())
      .then(({ result }) => result);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export { getPlaceDetails };
