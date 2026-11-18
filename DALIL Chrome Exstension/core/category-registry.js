/**
 * DALIL Category Registry. Legacy discovery terms, official provider type IDs,
 * aliases and descriptive attributes are separate concepts.
 * Type identifiers: Google Developers Place Types (New), rechecked 2026-11-14,
 * page updated 2026-11-09. CC BY 4.0 documentation; identifiers are API facts.
 * https://developers.google.com/maps/documentation/places/web-service/place-types
 * No Business Profile GCIDs or country availability are inferred.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DalilCategoryRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GOOGLE_TYPES_SNAPSHOT = {
  "version": "2026-11-09",
  "retrieved": "2026-11-14",
  "source": "https://developers.google.com/maps/documentation/places/web-service/place-types",
  "license": "CC-BY-4.0",
  "tableA": [
    {
      "id": "car_dealer",
      "group": "Automotive"
    },
    {
      "id": "car_rental",
      "group": "Automotive"
    },
    {
      "id": "car_repair",
      "group": "Automotive"
    },
    {
      "id": "car_wash",
      "group": "Automotive"
    },
    {
      "id": "ebike_charging_station",
      "group": "Automotive"
    },
    {
      "id": "electric_vehicle_charging_station",
      "group": "Automotive"
    },
    {
      "id": "gas_station",
      "group": "Automotive"
    },
    {
      "id": "parking",
      "group": "Automotive"
    },
    {
      "id": "parking_garage",
      "group": "Automotive"
    },
    {
      "id": "parking_lot",
      "group": "Automotive"
    },
    {
      "id": "rest_stop",
      "group": "Automotive"
    },
    {
      "id": "tire_shop",
      "group": "Automotive"
    },
    {
      "id": "truck_dealer",
      "group": "Automotive"
    },
    {
      "id": "business_center",
      "group": "Business"
    },
    {
      "id": "corporate_office",
      "group": "Business"
    },
    {
      "id": "coworking_space",
      "group": "Business"
    },
    {
      "id": "farm",
      "group": "Business"
    },
    {
      "id": "manufacturer",
      "group": "Business"
    },
    {
      "id": "ranch",
      "group": "Business"
    },
    {
      "id": "supplier",
      "group": "Business"
    },
    {
      "id": "television_studio",
      "group": "Business"
    },
    {
      "id": "art_gallery",
      "group": "Culture"
    },
    {
      "id": "art_museum",
      "group": "Culture"
    },
    {
      "id": "art_studio",
      "group": "Culture"
    },
    {
      "id": "auditorium",
      "group": "Culture"
    },
    {
      "id": "castle",
      "group": "Culture"
    },
    {
      "id": "cultural_landmark",
      "group": "Culture"
    },
    {
      "id": "fountain",
      "group": "Culture"
    },
    {
      "id": "historical_place",
      "group": "Culture"
    },
    {
      "id": "history_museum",
      "group": "Culture"
    },
    {
      "id": "monument",
      "group": "Culture"
    },
    {
      "id": "museum",
      "group": "Culture"
    },
    {
      "id": "performing_arts_theater",
      "group": "Culture"
    },
    {
      "id": "sculpture",
      "group": "Culture"
    },
    {
      "id": "academic_department",
      "group": "Education"
    },
    {
      "id": "educational_institution",
      "group": "Education"
    },
    {
      "id": "library",
      "group": "Education"
    },
    {
      "id": "preschool",
      "group": "Education"
    },
    {
      "id": "primary_school",
      "group": "Education"
    },
    {
      "id": "research_institute",
      "group": "Education"
    },
    {
      "id": "school",
      "group": "Education"
    },
    {
      "id": "secondary_school",
      "group": "Education"
    },
    {
      "id": "university",
      "group": "Education"
    },
    {
      "id": "adventure_sports_center",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "amphitheatre",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "amusement_center",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "amusement_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "aquarium",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "banquet_hall",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "barbecue_area",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "botanical_garden",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "bowling_alley",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "casino",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "childrens_camp",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "city_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "comedy_club",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "community_center",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "concert_hall",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "convention_center",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "cultural_center",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "cycling_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "dance_hall",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "dog_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "event_venue",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "ferris_wheel",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "garden",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "go_karting_venue",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "hiking_area",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "historical_landmark",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "indoor_playground",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "internet_cafe",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "karaoke",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "live_music_venue",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "marina",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "miniature_golf_course",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "movie_rental",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "movie_theater",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "national_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "night_club",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "observation_deck",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "off_roading_area",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "opera_house",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "paintball_center",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "philharmonic_hall",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "picnic_ground",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "planetarium",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "plaza",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "roller_coaster",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "skateboard_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "state_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "tourist_attraction",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "video_arcade",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "vineyard",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "visitor_center",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "water_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "wedding_venue",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "wildlife_park",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "wildlife_refuge",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "zoo",
      "group": "Entertainment and Recreation"
    },
    {
      "id": "public_bath",
      "group": "Facilities"
    },
    {
      "id": "public_bathroom",
      "group": "Facilities"
    },
    {
      "id": "stable",
      "group": "Facilities"
    },
    {
      "id": "accounting",
      "group": "Finance"
    },
    {
      "id": "atm",
      "group": "Finance"
    },
    {
      "id": "bank",
      "group": "Finance"
    },
    {
      "id": "acai_shop",
      "group": "Food and Drink"
    },
    {
      "id": "afghani_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "african_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "american_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "argentinian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "asian_fusion_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "asian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "australian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "austrian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "bagel_shop",
      "group": "Food and Drink"
    },
    {
      "id": "bakery",
      "group": "Food and Drink"
    },
    {
      "id": "bangladeshi_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "bar",
      "group": "Food and Drink"
    },
    {
      "id": "bar_and_grill",
      "group": "Food and Drink"
    },
    {
      "id": "barbecue_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "basque_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "bavarian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "beer_garden",
      "group": "Food and Drink"
    },
    {
      "id": "belgian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "bistro",
      "group": "Food and Drink"
    },
    {
      "id": "brazilian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "breakfast_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "brewery",
      "group": "Food and Drink"
    },
    {
      "id": "brewpub",
      "group": "Food and Drink"
    },
    {
      "id": "british_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "brunch_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "buffet_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "burmese_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "burrito_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "cafe",
      "group": "Food and Drink"
    },
    {
      "id": "cafeteria",
      "group": "Food and Drink"
    },
    {
      "id": "cajun_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "cake_shop",
      "group": "Food and Drink"
    },
    {
      "id": "californian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "cambodian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "candy_store",
      "group": "Food and Drink"
    },
    {
      "id": "cantonese_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "caribbean_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "cat_cafe",
      "group": "Food and Drink"
    },
    {
      "id": "chicken_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "chicken_wings_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "chilean_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "chinese_noodle_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "chinese_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "chocolate_factory",
      "group": "Food and Drink"
    },
    {
      "id": "chocolate_shop",
      "group": "Food and Drink"
    },
    {
      "id": "cocktail_bar",
      "group": "Food and Drink"
    },
    {
      "id": "coffee_roastery",
      "group": "Food and Drink"
    },
    {
      "id": "coffee_shop",
      "group": "Food and Drink"
    },
    {
      "id": "coffee_stand",
      "group": "Food and Drink"
    },
    {
      "id": "colombian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "confectionery",
      "group": "Food and Drink"
    },
    {
      "id": "croatian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "cuban_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "czech_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "danish_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "deli",
      "group": "Food and Drink"
    },
    {
      "id": "dessert_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "dessert_shop",
      "group": "Food and Drink"
    },
    {
      "id": "dim_sum_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "diner",
      "group": "Food and Drink"
    },
    {
      "id": "dog_cafe",
      "group": "Food and Drink"
    },
    {
      "id": "donut_shop",
      "group": "Food and Drink"
    },
    {
      "id": "dumpling_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "dutch_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "eastern_european_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "ethiopian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "european_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "falafel_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "family_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "fast_food_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "filipino_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "fine_dining_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "fish_and_chips_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "fondue_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "food_court",
      "group": "Food and Drink"
    },
    {
      "id": "french_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "fusion_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "gastropub",
      "group": "Food and Drink"
    },
    {
      "id": "german_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "greek_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "gyro_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "halal_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "hamburger_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "hawaiian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "hookah_bar",
      "group": "Food and Drink"
    },
    {
      "id": "hot_dog_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "hot_dog_stand",
      "group": "Food and Drink"
    },
    {
      "id": "hot_pot_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "hungarian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "ice_cream_shop",
      "group": "Food and Drink"
    },
    {
      "id": "indian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "indonesian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "irish_pub",
      "group": "Food and Drink"
    },
    {
      "id": "irish_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "israeli_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "italian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "japanese_curry_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "japanese_izakaya_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "japanese_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "juice_shop",
      "group": "Food and Drink"
    },
    {
      "id": "kebab_shop",
      "group": "Food and Drink"
    },
    {
      "id": "korean_barbecue_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "korean_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "latin_american_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "lebanese_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "lounge_bar",
      "group": "Food and Drink"
    },
    {
      "id": "malaysian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "meal_delivery",
      "group": "Food and Drink"
    },
    {
      "id": "meal_takeaway",
      "group": "Food and Drink"
    },
    {
      "id": "mediterranean_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "mexican_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "middle_eastern_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "mongolian_barbecue_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "moroccan_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "noodle_shop",
      "group": "Food and Drink"
    },
    {
      "id": "north_indian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "oyster_bar_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "pakistani_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "pastry_shop",
      "group": "Food and Drink"
    },
    {
      "id": "persian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "peruvian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "pizza_delivery",
      "group": "Food and Drink"
    },
    {
      "id": "pizza_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "polish_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "portuguese_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "pub",
      "group": "Food and Drink"
    },
    {
      "id": "ramen_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "romanian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "russian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "salad_shop",
      "group": "Food and Drink"
    },
    {
      "id": "sandwich_shop",
      "group": "Food and Drink"
    },
    {
      "id": "scandinavian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "seafood_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "shawarma_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "snack_bar",
      "group": "Food and Drink"
    },
    {
      "id": "soul_food_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "soup_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "south_american_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "south_indian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "southwestern_us_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "spanish_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "sports_bar",
      "group": "Food and Drink"
    },
    {
      "id": "sri_lankan_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "steak_house",
      "group": "Food and Drink"
    },
    {
      "id": "sushi_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "swiss_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "taco_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "taiwanese_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "tapas_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "tea_house",
      "group": "Food and Drink"
    },
    {
      "id": "tex_mex_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "thai_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "tibetan_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "tonkatsu_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "turkish_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "ukrainian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "vegan_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "vegetarian_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "vietnamese_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "western_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "wine_bar",
      "group": "Food and Drink"
    },
    {
      "id": "winery",
      "group": "Food and Drink"
    },
    {
      "id": "yakiniku_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "yakitori_restaurant",
      "group": "Food and Drink"
    },
    {
      "id": "administrative_area_level_1",
      "group": "Geographical Areas"
    },
    {
      "id": "administrative_area_level_2",
      "group": "Geographical Areas"
    },
    {
      "id": "country",
      "group": "Geographical Areas"
    },
    {
      "id": "locality",
      "group": "Geographical Areas"
    },
    {
      "id": "postal_code",
      "group": "Geographical Areas"
    },
    {
      "id": "school_district",
      "group": "Geographical Areas"
    },
    {
      "id": "city_hall",
      "group": "Government"
    },
    {
      "id": "courthouse",
      "group": "Government"
    },
    {
      "id": "embassy",
      "group": "Government"
    },
    {
      "id": "fire_station",
      "group": "Government"
    },
    {
      "id": "government_office",
      "group": "Government"
    },
    {
      "id": "local_government_office",
      "group": "Government"
    },
    {
      "id": "neighborhood_police_station",
      "group": "Government",
      "countries": [
        "JP"
      ]
    },
    {
      "id": "police",
      "group": "Government"
    },
    {
      "id": "post_office",
      "group": "Government"
    },
    {
      "id": "chiropractor",
      "group": "Health and Wellness"
    },
    {
      "id": "dental_clinic",
      "group": "Health and Wellness"
    },
    {
      "id": "dentist",
      "group": "Health and Wellness"
    },
    {
      "id": "doctor",
      "group": "Health and Wellness"
    },
    {
      "id": "drugstore",
      "group": "Health and Wellness"
    },
    {
      "id": "general_hospital",
      "group": "Health and Wellness"
    },
    {
      "id": "hospital",
      "group": "Health and Wellness"
    },
    {
      "id": "massage",
      "group": "Health and Wellness"
    },
    {
      "id": "massage_spa",
      "group": "Health and Wellness"
    },
    {
      "id": "medical_center",
      "group": "Health and Wellness"
    },
    {
      "id": "medical_clinic",
      "group": "Health and Wellness"
    },
    {
      "id": "medical_lab",
      "group": "Health and Wellness"
    },
    {
      "id": "pharmacy",
      "group": "Health and Wellness"
    },
    {
      "id": "physiotherapist",
      "group": "Health and Wellness"
    },
    {
      "id": "sauna",
      "group": "Health and Wellness"
    },
    {
      "id": "skin_care_clinic",
      "group": "Health and Wellness"
    },
    {
      "id": "spa",
      "group": "Health and Wellness"
    },
    {
      "id": "tanning_studio",
      "group": "Health and Wellness"
    },
    {
      "id": "wellness_center",
      "group": "Health and Wellness"
    },
    {
      "id": "yoga_studio",
      "group": "Health and Wellness"
    },
    {
      "id": "apartment_building",
      "group": "Housing"
    },
    {
      "id": "apartment_complex",
      "group": "Housing"
    },
    {
      "id": "condominium_complex",
      "group": "Housing"
    },
    {
      "id": "housing_complex",
      "group": "Housing"
    },
    {
      "id": "bed_and_breakfast",
      "group": "Lodging"
    },
    {
      "id": "budget_japanese_inn",
      "group": "Lodging"
    },
    {
      "id": "campground",
      "group": "Lodging"
    },
    {
      "id": "camping_cabin",
      "group": "Lodging"
    },
    {
      "id": "cottage",
      "group": "Lodging"
    },
    {
      "id": "extended_stay_hotel",
      "group": "Lodging"
    },
    {
      "id": "farmstay",
      "group": "Lodging"
    },
    {
      "id": "guest_house",
      "group": "Lodging"
    },
    {
      "id": "hostel",
      "group": "Lodging"
    },
    {
      "id": "hotel",
      "group": "Lodging"
    },
    {
      "id": "inn",
      "group": "Lodging"
    },
    {
      "id": "japanese_inn",
      "group": "Lodging"
    },
    {
      "id": "lodging",
      "group": "Lodging"
    },
    {
      "id": "mobile_home_park",
      "group": "Lodging"
    },
    {
      "id": "motel",
      "group": "Lodging"
    },
    {
      "id": "private_guest_room",
      "group": "Lodging"
    },
    {
      "id": "resort_hotel",
      "group": "Lodging"
    },
    {
      "id": "rv_park",
      "group": "Lodging"
    },
    {
      "id": "beach",
      "group": "Natural Features"
    },
    {
      "id": "island",
      "group": "Natural Features"
    },
    {
      "id": "lake",
      "group": "Natural Features"
    },
    {
      "id": "mountain_peak",
      "group": "Natural Features"
    },
    {
      "id": "nature_preserve",
      "group": "Natural Features"
    },
    {
      "id": "river",
      "group": "Natural Features"
    },
    {
      "id": "scenic_spot",
      "group": "Natural Features"
    },
    {
      "id": "woods",
      "group": "Natural Features"
    },
    {
      "id": "buddhist_temple",
      "group": "Places of Worship"
    },
    {
      "id": "church",
      "group": "Places of Worship"
    },
    {
      "id": "hindu_temple",
      "group": "Places of Worship"
    },
    {
      "id": "mosque",
      "group": "Places of Worship"
    },
    {
      "id": "shinto_shrine",
      "group": "Places of Worship"
    },
    {
      "id": "synagogue",
      "group": "Places of Worship"
    },
    {
      "id": "aircraft_rental_service",
      "group": "Services"
    },
    {
      "id": "association_or_organization",
      "group": "Services"
    },
    {
      "id": "astrologer",
      "group": "Services"
    },
    {
      "id": "barber_shop",
      "group": "Services"
    },
    {
      "id": "beautician",
      "group": "Services"
    },
    {
      "id": "beauty_salon",
      "group": "Services"
    },
    {
      "id": "body_art_service",
      "group": "Services"
    },
    {
      "id": "catering_service",
      "group": "Services"
    },
    {
      "id": "cemetery",
      "group": "Services"
    },
    {
      "id": "chauffeur_service",
      "group": "Services"
    },
    {
      "id": "child_care_agency",
      "group": "Services"
    },
    {
      "id": "consultant",
      "group": "Services"
    },
    {
      "id": "courier_service",
      "group": "Services"
    },
    {
      "id": "electrician",
      "group": "Services"
    },
    {
      "id": "employment_agency",
      "group": "Services"
    },
    {
      "id": "florist",
      "group": "Services"
    },
    {
      "id": "food_delivery",
      "group": "Services"
    },
    {
      "id": "foot_care",
      "group": "Services"
    },
    {
      "id": "funeral_home",
      "group": "Services"
    },
    {
      "id": "hair_care",
      "group": "Services"
    },
    {
      "id": "hair_salon",
      "group": "Services"
    },
    {
      "id": "insurance_agency",
      "group": "Services"
    },
    {
      "id": "laundry",
      "group": "Services"
    },
    {
      "id": "lawyer",
      "group": "Services"
    },
    {
      "id": "locksmith",
      "group": "Services"
    },
    {
      "id": "makeup_artist",
      "group": "Services"
    },
    {
      "id": "marketing_consultant",
      "group": "Services"
    },
    {
      "id": "moving_company",
      "group": "Services"
    },
    {
      "id": "nail_salon",
      "group": "Services"
    },
    {
      "id": "non_profit_organization",
      "group": "Services"
    },
    {
      "id": "painter",
      "group": "Services"
    },
    {
      "id": "pet_boarding_service",
      "group": "Services"
    },
    {
      "id": "pet_care",
      "group": "Services"
    },
    {
      "id": "plumber",
      "group": "Services"
    },
    {
      "id": "psychic",
      "group": "Services"
    },
    {
      "id": "real_estate_agency",
      "group": "Services"
    },
    {
      "id": "roofing_contractor",
      "group": "Services"
    },
    {
      "id": "service",
      "group": "Services"
    },
    {
      "id": "shipping_service",
      "group": "Services"
    },
    {
      "id": "storage",
      "group": "Services"
    },
    {
      "id": "summer_camp_organizer",
      "group": "Services"
    },
    {
      "id": "tailor",
      "group": "Services"
    },
    {
      "id": "telecommunications_service_provider",
      "group": "Services"
    },
    {
      "id": "tour_agency",
      "group": "Services"
    },
    {
      "id": "tourist_information_center",
      "group": "Services"
    },
    {
      "id": "travel_agency",
      "group": "Services"
    },
    {
      "id": "veterinary_care",
      "group": "Services"
    },
    {
      "id": "asian_grocery_store",
      "group": "Shopping"
    },
    {
      "id": "auto_parts_store",
      "group": "Shopping"
    },
    {
      "id": "bicycle_store",
      "group": "Shopping"
    },
    {
      "id": "book_store",
      "group": "Shopping"
    },
    {
      "id": "building_materials_store",
      "group": "Shopping"
    },
    {
      "id": "butcher_shop",
      "group": "Shopping"
    },
    {
      "id": "cell_phone_store",
      "group": "Shopping"
    },
    {
      "id": "clothing_store",
      "group": "Shopping"
    },
    {
      "id": "convenience_store",
      "group": "Shopping"
    },
    {
      "id": "cosmetics_store",
      "group": "Shopping"
    },
    {
      "id": "department_store",
      "group": "Shopping"
    },
    {
      "id": "discount_store",
      "group": "Shopping"
    },
    {
      "id": "discount_supermarket",
      "group": "Shopping"
    },
    {
      "id": "electronics_store",
      "group": "Shopping"
    },
    {
      "id": "farmers_market",
      "group": "Shopping"
    },
    {
      "id": "flea_market",
      "group": "Shopping"
    },
    {
      "id": "food_store",
      "group": "Shopping"
    },
    {
      "id": "furniture_store",
      "group": "Shopping"
    },
    {
      "id": "garden_center",
      "group": "Shopping"
    },
    {
      "id": "general_store",
      "group": "Shopping"
    },
    {
      "id": "gift_shop",
      "group": "Shopping"
    },
    {
      "id": "grocery_store",
      "group": "Shopping"
    },
    {
      "id": "hardware_store",
      "group": "Shopping"
    },
    {
      "id": "health_food_store",
      "group": "Shopping"
    },
    {
      "id": "home_goods_store",
      "group": "Shopping"
    },
    {
      "id": "home_improvement_store",
      "group": "Shopping"
    },
    {
      "id": "hypermarket",
      "group": "Shopping"
    },
    {
      "id": "jewelry_store",
      "group": "Shopping"
    },
    {
      "id": "liquor_store",
      "group": "Shopping"
    },
    {
      "id": "market",
      "group": "Shopping"
    },
    {
      "id": "pet_store",
      "group": "Shopping"
    },
    {
      "id": "shoe_store",
      "group": "Shopping"
    },
    {
      "id": "shopping_mall",
      "group": "Shopping"
    },
    {
      "id": "sporting_goods_store",
      "group": "Shopping"
    },
    {
      "id": "sportswear_store",
      "group": "Shopping"
    },
    {
      "id": "store",
      "group": "Shopping"
    },
    {
      "id": "supermarket",
      "group": "Shopping"
    },
    {
      "id": "tea_store",
      "group": "Shopping"
    },
    {
      "id": "thrift_store",
      "group": "Shopping"
    },
    {
      "id": "toy_store",
      "group": "Shopping"
    },
    {
      "id": "warehouse_store",
      "group": "Shopping"
    },
    {
      "id": "wholesaler",
      "group": "Shopping"
    },
    {
      "id": "womens_clothing_store",
      "group": "Shopping"
    },
    {
      "id": "arena",
      "group": "Sports"
    },
    {
      "id": "athletic_field",
      "group": "Sports"
    },
    {
      "id": "fishing_charter",
      "group": "Sports"
    },
    {
      "id": "fishing_pier",
      "group": "Sports"
    },
    {
      "id": "fishing_pond",
      "group": "Sports"
    },
    {
      "id": "fitness_center",
      "group": "Sports"
    },
    {
      "id": "golf_course",
      "group": "Sports"
    },
    {
      "id": "gym",
      "group": "Sports"
    },
    {
      "id": "ice_skating_rink",
      "group": "Sports"
    },
    {
      "id": "indoor_golf_course",
      "group": "Sports"
    },
    {
      "id": "playground",
      "group": "Sports"
    },
    {
      "id": "race_course",
      "group": "Sports"
    },
    {
      "id": "ski_resort",
      "group": "Sports"
    },
    {
      "id": "sports_activity_location",
      "group": "Sports"
    },
    {
      "id": "sports_club",
      "group": "Sports"
    },
    {
      "id": "sports_coaching",
      "group": "Sports"
    },
    {
      "id": "sports_complex",
      "group": "Sports"
    },
    {
      "id": "sports_school",
      "group": "Sports"
    },
    {
      "id": "stadium",
      "group": "Sports"
    },
    {
      "id": "swimming_pool",
      "group": "Sports"
    },
    {
      "id": "tennis_court",
      "group": "Sports"
    },
    {
      "id": "airport",
      "group": "Transportation"
    },
    {
      "id": "airstrip",
      "group": "Transportation"
    },
    {
      "id": "bike_sharing_station",
      "group": "Transportation"
    },
    {
      "id": "bridge",
      "group": "Transportation"
    },
    {
      "id": "bus_station",
      "group": "Transportation"
    },
    {
      "id": "bus_stop",
      "group": "Transportation"
    },
    {
      "id": "ferry_service",
      "group": "Transportation"
    },
    {
      "id": "ferry_terminal",
      "group": "Transportation"
    },
    {
      "id": "heliport",
      "group": "Transportation"
    },
    {
      "id": "international_airport",
      "group": "Transportation"
    },
    {
      "id": "light_rail_station",
      "group": "Transportation"
    },
    {
      "id": "park_and_ride",
      "group": "Transportation"
    },
    {
      "id": "subway_station",
      "group": "Transportation"
    },
    {
      "id": "taxi_service",
      "group": "Transportation"
    },
    {
      "id": "taxi_stand",
      "group": "Transportation"
    },
    {
      "id": "toll_station",
      "group": "Transportation"
    },
    {
      "id": "train_station",
      "group": "Transportation"
    },
    {
      "id": "train_ticket_office",
      "group": "Transportation"
    },
    {
      "id": "tram_stop",
      "group": "Transportation"
    },
    {
      "id": "transit_depot",
      "group": "Transportation"
    },
    {
      "id": "transit_station",
      "group": "Transportation"
    },
    {
      "id": "transit_stop",
      "group": "Transportation"
    },
    {
      "id": "transportation_service",
      "group": "Transportation"
    },
    {
      "id": "truck_stop",
      "group": "Transportation"
    }
  ],
  "tableB": [
    {
      "id": "town_square",
      "group": "Additional types"
    },
    {
      "id": "administrative_area_level_3",
      "group": "Additional types"
    },
    {
      "id": "administrative_area_level_4",
      "group": "Additional types"
    },
    {
      "id": "administrative_area_level_5",
      "group": "Additional types"
    },
    {
      "id": "administrative_area_level_6",
      "group": "Additional types"
    },
    {
      "id": "administrative_area_level_7",
      "group": "Additional types"
    },
    {
      "id": "archipelago",
      "group": "Additional types"
    },
    {
      "id": "colloquial_area",
      "group": "Additional types"
    },
    {
      "id": "continent",
      "group": "Additional types"
    },
    {
      "id": "establishment",
      "group": "Additional types"
    },
    {
      "id": "finance",
      "group": "Additional types"
    },
    {
      "id": "food",
      "group": "Additional types"
    },
    {
      "id": "general_contractor",
      "group": "Additional types"
    },
    {
      "id": "geocode",
      "group": "Additional types"
    },
    {
      "id": "health",
      "group": "Additional types"
    },
    {
      "id": "intersection",
      "group": "Additional types"
    },
    {
      "id": "landmark",
      "group": "Additional types"
    },
    {
      "id": "natural_feature",
      "group": "Additional types"
    },
    {
      "id": "neighborhood",
      "group": "Additional types"
    },
    {
      "id": "place_of_worship",
      "group": "Additional types"
    },
    {
      "id": "plus_code",
      "group": "Additional types"
    },
    {
      "id": "point_of_interest",
      "group": "Additional types"
    },
    {
      "id": "political",
      "group": "Additional types"
    },
    {
      "id": "postal_code_prefix",
      "group": "Additional types"
    },
    {
      "id": "postal_code_suffix",
      "group": "Additional types"
    },
    {
      "id": "postal_town",
      "group": "Additional types"
    },
    {
      "id": "premise",
      "group": "Additional types"
    },
    {
      "id": "route",
      "group": "Additional types"
    },
    {
      "id": "street_address",
      "group": "Additional types"
    },
    {
      "id": "sublocality",
      "group": "Additional types"
    },
    {
      "id": "sublocality_level_1",
      "group": "Additional types"
    },
    {
      "id": "sublocality_level_2",
      "group": "Additional types"
    },
    {
      "id": "sublocality_level_3",
      "group": "Additional types"
    },
    {
      "id": "sublocality_level_4",
      "group": "Additional types"
    },
    {
      "id": "sublocality_level_5",
      "group": "Additional types"
    },
    {
      "id": "subpremise",
      "group": "Additional types"
    }
  ]
};

  // English translations are DALIL display labels, not Google Business labels.
  const ENGLISH_LEAVES = {
    'S01.B01': 'Mosque|Congregational mosque|Large mosque|Prayer room|Women’s prayer room|Eid prayer ground|Zawiya|Roadside prayer room|Shopping center prayer room|Hospital prayer room|Airport prayer room|Historic mosque',
    'S01.B02': 'Church|Cathedral|Orthodox church|Catholic church|Protestant church|Evangelical church|Coptic church|Armenian church|Syriac church|Historic church|Monastery|Chapel',
    'S01.B03': 'Synagogue|Jewish temple|Hindu temple|Buddhist temple|Religious shrine|Religious mausoleum|Saint’s shrine|Sufi lodge|Khanqah',
    'S01.B04': 'Religious rulings office|Religious endowments office|Religious affairs office|Zakat foundation|Quran memorization association|Religious education center|Religious institute|Quranic school|Hajj and Umrah agency|Religious bookstore',
    'S01.B05': 'Religious event hall|Eid prayer square|Religious activity center|Quran learning hall|Community event house|Funeral home',
    'S02.B01': 'Restaurant|Family restaurant|Traditional restaurant|Fine dining restaurant|Buffet restaurant|Home cooking restaurant|Fast food restaurant|Cloud kitchen|Hotel restaurant',
    'S02.B02': 'Koshary restaurant|Ful and taameya restaurant|Barbecue restaurant|Kebab and kofta restaurant|Shawarma restaurant|Falafel restaurant|Mandi restaurant|Kabsa restaurant|Haneeth restaurant|Madhbi restaurant|Bukhari restaurant|Tagine restaurant|Couscous restaurant|Fish restaurant',
    'S02.B03': 'Pizza restaurant|Burger restaurant|Chicken restaurant|Seafood restaurant|Sushi restaurant|Chinese restaurant|Indian restaurant|Lebanese restaurant|Turkish restaurant|Moroccan restaurant|Italian restaurant|Vegetarian restaurant',
    'S02.B04': 'Cafe|Coffeehouse|Traditional coffeehouse|Internet cafe|Tea shop|Specialty coffee shop|Coffee roastery|Juice shop|Hot drinks shop|Smoothie shop|Drinks kiosk',
    'S02.B05': 'Bakery|Traditional bakery|Automated bakery|Sweets shop|Kunafa and basbousa shop|Ice cream shop|Donut shop|Chocolate shop|Pastry shop|Pie shop|Cake shop',
    'S02.B06': 'Cafeteria|Food court|Central kitchen|Catering service|Event catering kitchen|Food delivery|Prepared meals shop|Takeaway restaurant|Breakfast hall',
    'S03.B01': 'Supermarket|Hypermarket|Grocery store|Provision store|Spice shop|Fruit and vegetable shop|Butcher shop|Poultry shop|Fish shop|Dairy shop|Food warehouse',
    'S03.B02': 'Traditional market|Wholesale market|Vegetable market|Fish market|Livestock market|Weekly market|Craft market|Shopping mall|Shopping center|Retail complex|Secondhand market',
    'S03.B03': 'Clothing store|Men’s clothing store|Women’s clothing store|Children’s clothing store|Shoe store|Bag shop|Sportswear store|Fabric store|Traditional clothing store|Hijab shop',
    'S03.B04': 'Furniture showroom|Home goods store|Appliance store|Lighting store|Kitchen showroom|Carpet store|Curtain store|Paint store|Hardware store|Building materials store',
    'S03.B05': 'Phone shop|Computer store|Electronics store|Camera store|Phone accessories shop|Printer store|Video game store|Network equipment store',
    'S03.B06': 'Stationery shop|Bookstore|Toy store|Perfume shop|Cosmetics store|Gold shop|Jewelry store|Watch shop|Flower shop|Gift shop|Pet supplies store',
    'S03.B07': 'Commercial warehouse|Distribution center|Wholesale store|Professional equipment shop|Food distributor|Distribution agency|Ecommerce warehouse',
    'S04.B01': 'Hotel|Budget hotel|Business hotel|Five star hotel|Boutique hotel|Airport hotel|Heritage hotel|Extended stay hotel',
    'S04.B02': 'Tourist resort|Coastal resort|Wellness resort|Serviced apartments|Tourist chalet|Holiday villa|Holiday apartment rental|Country inn',
    'S04.B03': 'Guesthouse|Youth hostel|Hostel|Rest house|Tourist campsite|Desert campsite|Country house|Guest accommodation|Farmstay|Mountain lodge',
    'S05.B01': 'Residential building|Apartment building|Residential tower|House|Villa|Detached house|Country home|Traditional house|Mud brick house|Temporary housing',
    'S05.B02': 'Housing complex|Gated community|Residential neighborhood|Social housing|Cooperative housing|Student housing|Worker housing|Staff housing|Villa complex',
    'S05.B03': 'Property developer|Real estate agency|Property management office|Homeowners association|Unit rental office|Property maintenance office',
    'S06.B01': 'Company office|Headquarters|Company branch|Business center|Coworking space|Administrative office|Office tower|Chamber of commerce|Foundation headquarters',
    'S06.B02': 'Law office|Accounting office|Auditing office|Translation office|Consultancy office|Human resources office|Feasibility studies office|Marketing office|Design office',
    'S06.B03': 'Engineering office|Architectural office|Engineering consultancy|Surveying office|GIS office|Urban planning office|Software company|Technology communications company|Data center',
    'S06.B04': 'Call center|Customer service office|Reception office|Recruitment office|Business incubator|Business accelerator|Procurement office|Logistics headquarters',
    'S07.B01': 'Factory|Industrial complex|Industrial zone|Industrial workshop|Assembly plant|Packaging factory|Raw materials factory',
    'S07.B02': 'Food factory|Dairy factory|Beverage factory|Oil factory|Sugar factory|Canning factory|Slaughterhouse|Feed factory|Grain mill|Industrial bakery',
    'S07.B03': 'Spinning mill|Textile factory|Clothing factory|Carpet factory|Dyeing factory|Leather factory|Tannery|Footwear factory',
    'S07.B04': 'Cement factory|Steel plant|Aluminum factory|Glass factory|Ceramics factory|Plastics factory|Paper mill|Chemical factory|Pharmaceutical factory|Fertilizer factory',
    'S07.B05': 'Electronics factory|Vehicle factory|Spare parts factory|Battery factory|Energy equipment factory|Medical equipment factory|Electrical appliance factory',
    'S07.B06': 'Industrial warehouse|Grain silo|Loading area|Industrial maintenance center|Industrial treatment plant|Quality laboratory|Cold storage warehouse',
    'S08.B01': 'Nursery|Kindergarten|Preschool|Childcare center|Early learning center|Licensed home daycare',
    'S08.B02': 'Primary school|Preparatory school|Middle school|Secondary school|Public school|Private school|International school|Language school|Religious school|Inclusive school',
    'S08.B03': 'Technical school|Industrial school|Commercial school|Agricultural school|Nursing institute|Technical institute|Tourism institute|Vocational institute',
    'S08.B04': 'University|College|University campus|Higher institute|Academy|Community college|Academic department|Graduate institute|University research center',
    'S08.B05': 'Training center|Language learning center|Computer training center|Adult education center|Literacy center|Tutoring center|Education platform with physical premises|Music institute',
    'S08.B06': 'Public library|University library|School library|Scientific research center|Research center|Research laboratory|Academic archive',
    'S09.B01': 'General hospital|Private hospital|Specialist hospital|University hospital|Children’s hospital|Maternity hospital|Psychiatric hospital|Eye hospital|Dental hospital',
    'S09.B02': 'Medical center|General clinic|Dental clinic|Dermatology clinic|Cardiology clinic|Eye clinic|Pediatric clinic|Gynecology clinic|Physiotherapy center|Dialysis center',
    'S09.B03': 'Clinical laboratory|Medical laboratory|Radiology center|MRI center|Blood testing center|Oncology center|Rehabilitation center|Vaccination center|Blood bank',
    'S09.B04': 'Pharmacy|Duty pharmacy|Medical supplies store|Drug warehouse|Medical products factory|Drug distribution center',
    'S09.B05': 'Health unit|Family health center|Maternal and child health center|Primary care center|Mental health center|Ambulance center|Dispensary|Preventive medicine center',
    'S09.B06': 'Elderly care home|Disability care home|Speech therapy center|Addiction treatment center|Rehabilitation facility|Home care center',
    'S10.B01': 'Ministry|Government authority|Governorate|Governorate headquarters|City council|Local council|Citizen service center|Municipality|Government administrative office',
    'S10.B02': 'Civil registry|Passport office|Notary office|Land registry|Licensing office|Tax office|Social insurance office|Labor office|Supply office|Digital service center',
    'S10.B03': 'Court|Court of first instance|Appeals court|Public prosecutor’s office|Court complex|Experts office|Judgment enforcement office',
    'S10.B04': 'Embassy|Consulate|Diplomatic mission|Visa center|Trade representation office|Consular service center',
    'S11.B01': 'Police station|Police center|Police post|Traffic police unit|Fixed security patrol base|Civil defense center|Public border guard center',
    'S11.B02': 'Fire station|Fire unit|Ambulance post|Ambulance center|Emergency room|Rescue center|Disaster emergency center',
    'S11.B03': 'Marine rescue center|Beach rescue center|Early warning center|Civil protection center|Public shelter|Public relief warehouse',
    'S12.B01': 'Bank|Islamic bank|Bank branch|Development bank|Commercial bank|Central bank|Microfinance branch',
    'S12.B02': 'ATM|Currency exchange|Money transfer office|Finance office|Insurance company|Consumer finance company|Brokerage|Payment company',
    'S12.B03': 'Post office|Postal agency|Electronic payment point|Collection center|Postal services office|Cash transfer center',
    'S13.B01': 'Bus station|Bus stop|Minibus stop|Shared taxi stand|Taxi stand|Public transport station|Road transport center|Roadside rest stop|Toll station',
    'S13.B02': 'Train station|Subway station|Tram stop|Light rail station|Rapid transit station|Train depot|Rail maintenance workshop|Ticket office',
    'S13.B03': 'International airport|Domestic airport|Airstrip|Heliport|Passenger terminal|Air cargo terminal|Public control tower|Aviation services office',
    'S13.B04': 'Commercial port|Passenger port|Fishing port|Marina|Ferry terminal|Boat dock|Marine cargo terminal|Shipping office',
    'S13.B05': 'Bicycle parking|Bike sharing station|Footpath|Pedestrian crossing|Cycleway|Bicycle rental center',
    'S13.B06': 'Bridge|Road bridge|Tunnel|Intersection|Highway entrance|Truck weigh station|Roundabout|Road gate|Service road',
    'S14.B01': 'Petrol station|Diesel station|Fuel station|Natural gas station|LPG station|Electric vehicle charging station|Electric bicycle charging point',
    'S14.B02': 'Car showroom|Car dealership|Used car showroom|Mechanic workshop|Auto electrical workshop|Service center|Tire shop|Auto parts shop|Car wash center',
    'S14.B03': 'Car park|Multistory parking garage|Underground parking garage|Truck parking|Car rental center|Tourist transport parking|Vehicle storage yard',
    'S15.B01': 'Power station|Solar power station|Wind farm|Gas power station|Steam power station|Hydroelectric power station|Bioenergy power station',
    'S15.B02': 'Electrical substation|Distribution station|Electrical transformer|Electricity control center|Charging station|Electricity poles|Power transmission lines',
    'S15.B03': 'Oil field|Gas field|Oil refinery|Fuel depot|Oil pumping station|Gas pumping station|Gas storage station|Oil terminal',
    'S16.B01': 'Drinking water plant|Water purification plant|Water reservoir|Water tower|Water well|Water intake|Water pumping station|Irrigation network|Desalination plant',
    'S16.B02': 'Wastewater treatment plant|Sewage lifting station|Sewage pumping station|Sedimentation basin|Sewage tanks|Water reuse plant|Sludge treatment site',
    'S16.B03': 'Stormwater drainage station|Drainage outfall|Stormwater collection basin|Flood protection dam|Drainage channel|Drainage gate|Stormwater detention tank',
    'S17.B01': 'Waste dump|Sanitary landfill|Waste sorting center|Recycling station|Waste collection point|Waste transfer station|Recycling factory|Scrap center',
    'S17.B02': 'Air quality monitoring station|Noise monitoring station|Water testing laboratory|Pollution monitoring center|Environmental education center|Weather station',
    'S17.B03': 'Nature preserve|Wildlife protection center|Coastal protection center|Environmental monitoring station|Breeding center|Ecological garden',
    'S18.B01': 'Telecommunications tower|Signal relay station|Telephone exchange|Data center|Internet center|Network distribution point|Internet provider office',
    'S18.B02': 'Telecommunications branch|Mobile phone store|Phone repair center|Telecommunications customer service|Computer repair center|Networking center',
    'S19.B01': 'Barber|Beauty salon|Women’s salon|Spa|Massage center|Nail salon|Cosmetic treatment center',
    'S19.B02': 'Plumber|Electrician|Air conditioning technician|Cleaning company|Pest control service|Moving company|Laundry|Locksmith|Carpentry workshop',
    'S19.B03': 'Shipping service|Courier service|Translation office|Printing office|Photocopying center|Equipment maintenance center|Storage warehouse',
    'S19.B04': 'Veterinary clinic|Pet store|Animal care center|Animal shelter|Animal training center',
    'S20.B01': 'Archaeology museum|History museum|Art museum|Science museum|Natural history museum|Heritage museum|Maritime museum|Local museum',
    'S20.B02': 'Theater|Opera house|Concert hall|Cinema|Exhibition hall|Art gallery|Art studio|Music institute|Creativity center',
    'S20.B03': 'Cultural center|Culture house|Publishing house|Archive|Cultural library|Traditional crafts center|Heritage exhibition',
    'S21.B01': 'Archaeological site|Castle|Fort|Historic palace|Ancient city|Ancient cemetery|Ancient temple|Memorial|Heritage building|Historic route',
    'S21.B02': 'Tourist information center|Tour company|Excursion agency|Tour guide office|Visitor center|Tourist bus station|Tour booking center',
    'S21.B03': 'Tourist attraction|Panoramic viewpoint|Observation deck|Historic fountain|Public square|Heritage market|Known photography spot',
    'S22.B01': 'Public park|Botanical garden|Recreation park|Zoo|Amusement park|Water park|Picnic area|Children’s park|Urban park',
    'S22.B02': 'Wedding hall|Conference hall|Exhibition center|Event hall|Celebration center|Open air theater|Meeting center',
    'S22.B03': 'Bowling alley|Amusement center|Video arcade|Cinema|Social club|Seaside club|Horse riding center|Barbecue area|Diving center',
    'S23.B01': 'Football pitch|Basketball court|Tennis court|Padel court|Volleyball court|Multipurpose field|Stadium|Sports complex|Sports hall',
    'S23.B02': 'Sports club|Gym|Fitness center|Swimming pool|Swimming center|Sports academy|Sports school|Running track|Cycleway',
    'S23.B03': 'Golf course|Equestrian center|Race course|Climbing center|Licensed sports shooting center|Skating center|Water sports facilities',
    'S24.B01': 'Campsite|Excursion area|Hiking trail|Mountain biking trail|Trailhead|Desert campsite|Safari site|Stargazing area',
    'S24.B02': 'Beach|Boat marina|Diving center|Scuba diving center|Boat rental center|Swimming beach|Sport fishing center|Rowing center',
    'S24.B03': 'Nature preserve|Birdwatching area|Observation deck|Ecological area|Geopark|Nature preserve visitor center',
    'S25.B01': 'Mountain|Mountain peak|Hill|Plateau|Valley|Depression|Plain|Sand dune|Cliff|Mountain ridge|Cave|Volcanic crater',
    'S25.B02': 'River|Lake|Salt lake|Swamp|Water spring|Natural spring|Waterfall|Pond|Creek|Oasis|Bay|Inlet',
    'S25.B03': 'Forest|Woodland|Mangrove|Pasture|Orchard|Grassland|Desert vegetation area|Vegetated dunes',
    'S25.B04': 'Island|Peninsula|Rocky beach|Sandy beach|Delta|River mouth|Coral reef|Headland|Natural harbor',
    'S26.B01': 'Farm|Field|Orchard|Date palm farm|Olive farm|Grain farm|Vegetable farm|Greenhouse|Plant nursery|Organic farm',
    'S26.B02': 'Poultry farm|Cattle farm|Sheep farm|Camel farm|Fish farm|Apiary|Stable|Barn|Hatchery',
    'S26.B03': 'Agricultural association|Agricultural extension center|Agricultural supplies store|Sorting and packing station|Irrigation station|Crop warehouse|Livestock market',
    'S27.B01': 'Quarry|Concrete factory|Concrete batching plant|Brick factory|Block factory|Asphalt plant|Insulation materials factory|Steel warehouse|Building materials warehouse',
    'S27.B02': 'Construction site|Construction workshop|Contracting office|Construction company|Heavy equipment workshop|Equipment rental center|Construction materials warehouse',
    'S28.B01': 'Warehouse|General warehouse|Cold storage warehouse|Drug warehouse|Food warehouse|Silo|Commercial warehouse|Storage area',
    'S28.B02': 'Distribution center|Logistics center|Cargo terminal|Container depot|Customs zone|Parcel sorting station|Delivery center|Freight transfer station',
    'S29.B01': 'Charity|Civil association|Nonprofit organization|Development association|Relief association|Orphan care association|Volunteer center',
    'S29.B02': 'Youth center|Community center|Social club|Community event house|Community hall|Women’s center|Family care center',
    'S29.B03': 'Orphanage|Elderly home|Shelter|Charity kitchen|Food bank|Aid distribution center|Social care home',
    'S30.B01': 'Cemetery|Public cemetery|Family cemetery|Historic cemetery|Licensed communal burial ground|Public historic grave',
    'S30.B02': 'Funeral washing facility|Funeral home|Funeral services office|Legally available crematorium|Condolence hall',
    'S31.B01': 'Country|Governorate|State|Region|District|Municipality|City|Village|Neighborhood|Subdistrict|Postal area',
    'S31.B02': 'Official border crossing|Customs checkpoint|Customs center|Land border crossing|Border port|Free zone gate',
    'S31.B03': 'Residential zone|Industrial zone|Commercial zone|Agricultural zone|Vacant land|Public services land|Tourism zone|Education zone'
  };

  const TYPE_EQUIVALENTS = {
    'Prayer room':'dalil:prayer_room','Women’s prayer room':'dalil:prayer_room','Roadside prayer room':'dalil:prayer_room','Shopping center prayer room':'dalil:prayer_room','Hospital prayer room':'dalil:prayer_room','Airport prayer room':'dalil:prayer_room',
    'Congregational mosque': 'mosque', 'Large mosque': 'mosque', 'Historic mosque': 'mosque',
    'Church': 'church', 'Cathedral': 'church', 'Orthodox church': 'church', 'Catholic church': 'church',
    'Protestant church': 'church', 'Evangelical church': 'church', 'Coptic church': 'church',
    'Armenian church': 'church', 'Syriac church': 'church', 'Historic church': 'church', 'Chapel': 'church',
    'Jewish temple': 'synagogue', 'Coffeehouse': 'cafe', 'Traditional coffeehouse': 'cafe',
    'Specialty coffee shop': 'coffee_shop', 'Sweets shop': 'dessert_shop', 'Traditional bakery': 'bakery',
    'Automated bakery': 'bakery', 'Burger restaurant': 'hamburger_restaurant', 'Fish restaurant': 'seafood_restaurant',
    'Barber': 'barber_shop', 'Phone shop': 'cell_phone_store', 'Mobile phone store': 'cell_phone_store',
    'Bookstore': 'book_store', 'Flower shop': 'florist', 'Pet supplies store': 'pet_store',
    'Shopping center': 'shopping_mall', 'Retail complex': 'shopping_mall', 'Bank branch': 'bank',
    'Islamic bank': 'bank', 'Development bank': 'bank', 'Commercial bank': 'bank', 'Central bank': 'bank',
    'Petrol station': 'gas_station', 'Diesel station': 'gas_station', 'Fuel station': 'gas_station',
    'Car showroom': 'car_dealer', 'Car dealership': 'car_dealer', 'Used car showroom': 'car_dealer',
    'Mechanic workshop': 'car_repair', 'Auto electrical workshop': 'car_repair', 'Car wash center': 'car_wash',
    'Auto parts shop': 'auto_parts_store', 'Car park': 'parking', 'Car rental center': 'car_rental',
    'Multistory parking garage': 'parking_garage', 'Underground parking garage': 'parking_garage',
    'Roadside rest stop': 'rest_stop', 'Road bridge': 'bridge', 'Domestic airport': 'airport',
    'Public school': 'school', 'Private school': 'school', 'International school': 'school',
    'Language school': 'school', 'Religious school': 'school', 'Inclusive school': 'school',
    'Preparatory school': 'secondary_school', 'Middle school': 'secondary_school',
    'University campus': 'university', 'University research center': 'research_institute',
    'Scientific research center': 'research_institute', 'Research center': 'research_institute',
    'Public library': 'library', 'University library': 'library', 'School library': 'library',
    'Duty pharmacy': 'pharmacy', 'Clinical laboratory': 'medical_lab', 'Medical laboratory': 'medical_lab',
    'General clinic': 'medical_clinic', 'Dermatology clinic': 'skin_care_clinic',
    'Physiotherapy center': 'physiotherapist', 'Private hospital': 'hospital', 'Specialist hospital': 'hospital',
    'University hospital': 'hospital', 'Children’s hospital': 'hospital', 'Maternity hospital': 'hospital',
    'Psychiatric hospital': 'hospital', 'Eye hospital': 'hospital', 'Dental hospital': 'hospital',
    'Police center': 'police', 'Police post': 'police', 'Fire unit': 'fire_station',
    'Court': 'courthouse', 'Court of first instance': 'courthouse', 'Appeals court': 'courthouse',
    'Court complex': 'courthouse', 'Elderly care home': 'dalil:elderly_care_home',
    'Budget hotel': 'hotel', 'Business hotel': 'hotel', 'Five star hotel': 'hotel', 'Boutique hotel': 'hotel',
    'Airport hotel': 'hotel', 'Heritage hotel': 'hotel', 'Guesthouse': 'guest_house', 'Youth hostel': 'hostel',
    'Tourist resort': 'resort_hotel', 'Coastal resort': 'resort_hotel', 'Wellness resort': 'resort_hotel',
    'Campsite': 'campground', 'Tourist campsite': 'campground', 'Desert campsite': 'campground',
    'Residential building': 'apartment_building', 'Residential tower': 'apartment_building',
    'Gated community': 'housing_complex', 'Company office': 'corporate_office', 'Headquarters': 'corporate_office',
    'Accounting office': 'accounting', 'Law office': 'lawyer', 'Consultancy office': 'consultant',
    'Marketing office': 'marketing_consultant', 'Recruitment office': 'employment_agency',
    'Real estate agency': 'real_estate_agency', 'Factory': 'manufacturer',
    'Public park': 'park', 'Recreation park': 'park', 'Children’s park': 'playground', 'Urban park': 'city_park',
    'Picnic area': 'picnic_ground', 'Archaeology museum': 'museum', 'Science museum': 'museum',
    'Natural history museum': 'museum', 'Heritage museum': 'museum', 'Maritime museum': 'museum',
    'Local museum': 'museum', 'Cinema': 'movie_theater', 'Theater': 'performing_arts_theater',
    'Conference hall': 'convention_center', 'Open air theater': 'amphitheatre',
    'Wedding hall': 'wedding_venue', 'Event hall': 'event_venue', 'Tour company': 'travel_agency',
    'Excursion agency': 'tour_agency', 'Panoramic viewpoint': 'scenic_spot', 'Historic fountain': 'fountain',
    'Public square': 'plaza', 'Memorial': 'monument', 'Historic palace': 'historical_place',
    'Heritage building': 'historical_place', 'Archaeological site': 'historical_place',
    'Swimming center': 'swimming_pool', 'Sports hall': 'sports_complex', 'Farmstay': 'farmstay',
    'Forest': 'woods', 'Woodland': 'woods', 'Salt lake': 'lake', 'Rocky beach': 'beach', 'Sandy beach': 'beach',
    'Boat marina': 'marina', 'Wholesaler': 'wholesaler', 'Wholesale store': 'wholesaler',
    'Building materials warehouse': 'building_materials_store', 'Drug warehouse': 'dalil:drug_warehouse',
    'Storage warehouse': 'storage', 'General warehouse': 'storage', 'Warehouse': 'storage',
    'Civil association': 'association_or_organization', 'Charity': 'non_profit_organization',
    'Nonprofit organization': 'non_profit_organization', 'Community event house': 'community_center',
    'Social club': 'community_center', 'Community hall': 'community_center',
    'Public cemetery': 'cemetery', 'Family cemetery': 'cemetery', 'Historic cemetery': 'cemetery',
    'Funeral services office': 'funeral_home', 'Governorate': 'administrative_area_level_1',
    'State': 'administrative_area_level_1', 'City': 'locality', 'Village': 'locality', 'Postal area': 'postal_code'
  };

  const MULTILINGUAL_ALIASES = {
    mosque: { ar: ['مسجد', 'مساجد', 'جامع', 'جوامع'], en: ['mosques', 'masjid'], fr: ['mosquée', 'mosquées'], es: ['mezquita'], pt: ['mesquita'], hi: ['मस्जिद'], zh: ['清真寺'], ja: ['モスク'] },
    school: { ar: ['مدرسة', 'مدارس', 'الفصل الواحد', 'مدارس الفصل الواحد', 'مدرسة الفصل الواحد', 'مدارس مجتمعية'], en: ['schools', 'one-classroom schools', 'community schools'], fr: ['école', 'écoles'], es: ['escuela'], pt: ['escola'], hi: ['विद्यालय', 'स्कूल'], zh: ['学校'], ja: ['学校'] },
    hospital: { ar: ['مستشفى', 'مستشفيات'], en: ['hospitals'], fr: ['hôpital'], es: ['hospitales'], pt: ['hospitais'], hi: ['अस्पताल'], zh: ['医院'], ja: ['病院'] },
    medical_clinic: { ar: ['عيادة', 'عيادات'], en: ['clinic', 'clinics'], fr: ['clinique'], es: ['clínica'], pt: ['clínica'] },
    pharmacy: { ar: ['صيدلية', 'صيدليات', 'اجزاخانة', 'اجزاخانه', 'اجزخانة', 'اجزخانه'], en: ['pharmacies'], fr: ['pharmacie'], es: ['farmacia'], pt: ['farmácia'], hi: ['दवा की दुकान'], zh: ['药店'], ja: ['薬局'] },
    restaurant: { ar: ['مطاعم'], en: ['restaurants'], fr: ['restaurant'], es: ['restaurante'], pt: ['restaurante'], hi: ['रेस्तरां'], zh: ['餐厅'], ja: ['レストラン'] },
    cafe: { ar: ['مقهى', 'مقاهي', 'كافيه', 'كافيهات', 'قهوة', 'قهوه', 'شيشة'], en: ['cafes', 'café'], fr: ['café'], es: ['cafetería'], pt: ['café'], hi: ['कैफ़े'], zh: ['咖啡馆'], ja: ['カフェ'] },
    bank: { ar: ['بنك', 'بنوك', 'مصرف', 'مصارف'], en: ['banks'], fr: ['banque'], es: ['banco'], pt: ['banco'], hi: ['बैंक'], zh: ['银行'], ja: ['銀行'] },
    atm: { ar: ['صراف آلي', 'ماكينة صراف آلي'], en: ['cash machine', 'automated teller machine'], fr: ['distributeur automatique'], es: ['cajero automático'] },
    gas_station: { ar: ['محطة بنزين', 'محطة وقود', 'بنزينة', 'محطات وقود'], en: ['petrol station', 'fuel station'], fr: ['station-service'], es: ['gasolinera'], pt: ['posto de combustível'] },
    hotel: { ar: ['فندق', 'فنادق', 'لوكانده', 'لوكاندا', 'نزل'], en: ['hotels'] },
    bakery: { ar: ['مخبز', 'مخابز', 'فرن', 'افران', 'مخبوزات'], en: ['bakeries'] },
    car_repair: { ar: ['ورشة', 'ورشه', 'ميكانيكي', 'تصليح سيارات', 'صيانة سيارات', 'بنشري', 'عفشجي'], en: ['car repair', 'mechanic'] },
    barber_shop: { ar: ['حلاق', 'صالون حلاقة', 'صالون حلاقه', 'كوافير رجالي'], en: ['barber'] },
    grocery_store: { ar: ['بقالة', 'بقاله', 'دكان', 'دكانه'], en: ['grocery'] },
    supermarket: { ar: ['سوبر ماركت', 'ميني ماركت'], en: ['supermarkets'] }
  };

  // Extracted schema-only subset from iD (ISC), blob revisions pinned per preset.
  // No source executable code or OSM feature data is included.
  const OSM_PRESET_METADATA = {
  "restaurant": {
    "path": "data/presets/amenity/restaurant.json",
    "blobSha": "5bd7d84a224727f90d46612319030d13b1694e10",
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/amenity/restaurant.json",
    "license": "ISC",
    "tags": {
      "amenity": "restaurant"
    },
    "fields": [
      "name",
      "cuisine",
      "diet_multi",
      "address",
      "building_area_yes",
      "opening_hours",
      "phone",
      "website",
      "outdoor_seating"
    ],
    "moreFields": [
      "{@templates/internet_access}",
      "{@templates/poi}",
      "air_conditioning",
      "bar",
      "branch_brand",
      "brand",
      "brewery",
      "capacity",
      "changing_table",
      "delivery",
      "fhrs/id-GB",
      "highchair",
      "indoor_seating",
      "microbrewery",
      "min_age",
      "operator",
      "organic",
      "reservation",
      "self_service",
      "smoking",
      "sport/sport_pub",
      "stroller",
      "stars",
      "takeaway",
      "toilets",
      "toilets/wheelchair",
      "toilets/menstrual_products_poi",
      "website/menu"
    ],
    "icon": "maki-restaurant"
  },
  "cafe": {
    "path": "data/presets/amenity/cafe.json",
    "blobSha": "4efdf275f8f9508adc91dfa9dcd31204d0196f64",
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/amenity/cafe.json",
    "license": "ISC",
    "tags": {
      "amenity": "cafe"
    },
    "fields": [
      "name",
      "cuisine",
      "address",
      "building_area_yes",
      "opening_hours",
      "outdoor_seating",
      "{@templates/internet_access}",
      "phone",
      "website",
      "opening_hours/drive_through"
    ],
    "moreFields": [
      "{@templates/internet_access}",
      "{@templates/poi}",
      "air_conditioning",
      "bar",
      "branch_brand",
      "brand",
      "capacity",
      "changing_table",
      "delivery",
      "diet_multi",
      "drive_through",
      "highchair",
      "indoor_seating",
      "min_age",
      "organic",
      "reservation",
      "self_service",
      "smoking",
      "street_vendor",
      "stroller",
      "takeaway",
      "toilets",
      "toilets/wheelchair",
      "toilets/menstrual_products_poi",
      "fhrs/id-GB",
      "website/menu"
    ],
    "icon": "maki-cafe"
  },
  "pharmacy": {
    "path": "data/presets/amenity/pharmacy.json",
    "blobSha": "b247a7ff79dae0dd318214dce8af4d587823d138",
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/amenity/pharmacy.json",
    "license": "ISC",
    "tags": {
      "amenity": "pharmacy"
    },
    "fields": [
      "name",
      "operator",
      "address",
      "building_area_yes",
      "opening_hours",
      "dispensing",
      "drive_through",
      "opening_hours/drive_through",
      "phone",
      "website"
    ],
    "moreFields": [
      "{@templates/poi}",
      "branch_brand",
      "brand"
    ],
    "icon": "maki-pharmacy"
  },
  "hospital": {
    "path": "data/presets/amenity/hospital.json",
    "blobSha": "1638a00de45a775d5daa74835da251c4cd2a1ba6",
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/amenity/hospital.json",
    "license": "ISC",
    "tags": {
      "amenity": "hospital"
    },
    "fields": [
      "name",
      "operator",
      "operator/type",
      "healthcare/speciality",
      "address",
      "emergency"
    ],
    "moreFields": [
      "{@templates/internet_access}",
      "{@templates/poi}"
    ],
    "icon": "maki-hospital"
  },
  "bank": {
    "path": "data/presets/amenity/bank.json",
    "blobSha": "08eec2a1e2082b39d2ab35ff90cf8492874081e7",
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/amenity/bank.json",
    "license": "ISC",
    "tags": {
      "amenity": "bank"
    },
    "fields": [
      "name",
      "operator",
      "address",
      "building_area_yes",
      "opening_hours",
      "atm",
      "drive_through",
      "opening_hours/drive_through"
    ],
    "moreFields": [
      "{@templates/internet_access}",
      "{@templates/poi}",
      "air_conditioning",
      "branch_brand",
      "brand",
      "currency_multi"
    ],
    "icon": "maki-bank"
  },
  "atm": {
    "path": "data/presets/amenity/atm.json",
    "blobSha": "69ed7c58765e8e83da22ecf4179b79e98b1455a3",
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/amenity/atm.json",
    "license": "ISC",
    "tags": {
      "amenity": "atm"
    },
    "fields": [
      "operator",
      "network",
      "cash_in",
      "currency_multi",
      "drive_through_common_for_atm"
    ],
    "moreFields": [
      "branch_brand",
      "ref",
      "brand",
      "covered",
      "drive_through_uncommon_for_atm",
      "height",
      "indoor",
      "level",
      "lit",
      "manufacturer",
      "opening_hours",
      "wheelchair"
    ],
    "icon": "temaki-atm2"
  },
  "gas_station": {
    "path": "data/presets/amenity/fuel.json",
    "blobSha": "a7ccb990b8056791316b6decff6a643b7494f69e",
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/amenity/fuel.json",
    "license": "ISC",
    "tags": {
      "amenity": "fuel"
    },
    "fields": [
      "name",
      "brand",
      "operator",
      "address",
      "fuel/fuel_multi",
      "fuel/fuel_multi-RU",
      "self_service",
      "building_area"
    ],
    "moreFields": [
      "{@templates/poi}",
      "branch_brand",
      "toilets"
    ],
    "icon": "maki-fuel"
  },
  "mosque": {
    "path": "data/presets/amenity/place_of_worship/muslim.json",
    "blobSha": "461aea0150594eefc873b8c64a04ce716203c762",
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/amenity/place_of_worship/muslim.json",
    "license": "ISC",
    "tags": {
      "amenity": "place_of_worship",
      "religion": "muslim"
    },
    "fields": [
      "name",
      "religion",
      "denomination",
      "{amenity/place_of_worship}"
    ],
    "moreFields": [
      "{amenity/place_of_worship}"
    ],
    "icon": "maki-religious-muslim"
  }
};

  // Reviewed iD tagging-schema subset; semantic mappings, not provider equivalence.
  const OSM_TYPE_TAGS = {
    mosque: [{ key: 'amenity', value: 'place_of_worship' }, { key: 'religion', value: 'muslim' }],
    restaurant: [{ key: 'amenity', value: 'restaurant' }],
    cafe: [{ key: 'amenity', value: 'cafe' }],
    school: [{ key: 'amenity', value: 'school' }],
    primary_school: [{ key: 'amenity', value: 'school' }],
    secondary_school: [{ key: 'amenity', value: 'school' }],
    pharmacy: [{ key: 'amenity', value: 'pharmacy' }],
    hospital: [{ key: 'amenity', value: 'hospital' }],
    general_hospital: [{ key: 'amenity', value: 'hospital' }],
    bank: [{ key: 'amenity', value: 'bank' }],
    atm: [{ key: 'amenity', value: 'atm' }],
    gas_station: [{ key: 'amenity', value: 'fuel' }]
  };

  // The shared module is loaded first in the service worker, the export worker
  // and the dashboard. The inline fallback keeps this UMD usable on its own
  // (for example in an isolated VM test) with exactly the same letter rules.
  const ArabicFold = (typeof DalilArabic !== 'undefined' && DalilArabic?.normalize) ? DalilArabic
    : (typeof require === 'function' ? (() => { try { return require('./arabic-normalize.js'); } catch (_) { return null; } })() : null);
  function normalize(value) {
    if (ArabicFold?.normalize) return ArabicFold.normalize(value);
    return String(value == null ? '' : value).normalize('NFKC').toLowerCase()
      .replace(/[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').trim().replace(/\s+/g, ' ');
  }

  function symbolId(id) { return 'dalil.' + id.replace(/[^a-z0-9]+/gi, '-').toLowerCase(); }
  function typeLabel(id) { return id.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()); }
  function editDistance(a, b, maxDistance) {
    const aa = Array.from(a), bb = Array.from(b);
    if (Math.abs(aa.length - bb.length) > maxDistance) return maxDistance + 1;
    let previous = Array.from({ length: bb.length + 1 }, (_, i) => i);
    for (let i = 1; i <= aa.length; i++) {
      const current = [i]; let minimum = i;
      for (let j = 1; j <= bb.length; j++) {
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (aa[i - 1] === bb[j - 1] ? 0 : 1));
        minimum = Math.min(minimum, current[j]);
      }
      if (minimum > maxDistance) return maxDistance + 1;
      previous = current;
    }
    return previous[bb.length];
  }

  function create(sectors) {
    const categories = new Map(), leafById = new Map(), labelLeaves = new Map(), englishConcepts = new Map(), index = new Map();
    const official = new Map([
      ...GOOGLE_TYPES_SNAPSHOT.tableA.map(t => [t.id, { ...t, table: 'A', filterable: true }]),
      ...GOOGLE_TYPES_SNAPSHOT.tableB.map(t => [t.id, { ...t, table: 'B', filterable: false }])
    ]);
    function addIndex(label, category, locale, leafId) {
      const key = normalize(label); if (!key) return;
      if (!index.has(key)) index.set(key, []);
      const entries = index.get(key);
      if (!entries.some(e => e.category.canonicalId === category.canonicalId)) entries.push({ category, label, locale, leafId });
    }
    for (const type of official.values()) {
      const canonicalId = 'google_places:' + type.id;
      const arAlias = MULTILINGUAL_ALIASES[type.id]?.ar?.[0];
      categories.set(canonicalId, {
        canonicalId, googlePlaceType: type.id, googleGcid: null,
        labels: { ar: arAlias || null, en: type.id === 'atm' ? 'ATM' : typeLabel(type.id) },
        aliases: MULTILINGUAL_ALIASES[type.id] || {}, groupId: null, parentId: null,
        providerGroup: type.group, providerTable: type.table, filterable: type.filterable,
        classificationOrigin: 'google_places_type', labelOrigin: 'dalil_translation',
        source: GOOGLE_TYPES_SNAPSHOT.source, sourceVersion: GOOGLE_TYPES_SNAPSHOT.version,
        symbolId: symbolId(canonicalId), legacyLeafIds: [],
        attributeSchema: (OSM_PRESET_METADATA[type.id]?.fields || []).filter(f => !f.startsWith('{')).map(key => ({
          key, type: 'source_defined', source: OSM_PRESET_METADATA[type.id].source,
          sourceBlobSha: OSM_PRESET_METADATA[type.id].blobSha, required: false
        })),
        supportedProviders: ['google_maps_dom', ...(OSM_TYPE_TAGS[type.id] ? ['osm_overpass'] : [])],
        osmTags: OSM_TYPE_TAGS[type.id] || [],
        osmMapping: OSM_TYPE_TAGS[type.id] ? { relation: ['primary_school', 'secondary_school', 'general_hospital'].includes(type.id) ? 'broader' : 'related', source: 'https://github.com/openstreetmap/id-tagging-schema', scope: 'tagged_features_only' } : null,
        countryAvailability: { status: type.countries ? 'restricted' : 'unknown', countries: type.countries || [], reason: type.countries ? 'provider_documented_restriction' : 'provider_coverage_not_queried' }
      });
    }
    for (const sector of sectors) for (const branch of sector.branches) {
      const english = (ENGLISH_LEAVES[branch.id] || '').split('|');
      if (english.length !== branch.leaves.length) throw new Error('Incomplete taxonomy translations: ' + branch.id);
      branch.nameOrigin = sector.nameOrigin = 'dalil_organization';
      branch.leafObjects = branch.leaves.map((name, i) => {
        const id = `${branch.id}.L${String(i + 1).padStart(2, '0')}`;
        const en = english[i];
        const directType = en.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '_');
        const mapped = TYPE_EQUIVALENTS[en] || (official.has(directType) ? directType : null);
        const googleType = official.has(mapped) ? mapped : null;
        // Identical Arabic wording can have different meanings (charging versus
        // cargo terminal). Merge only an explicitly shared type or English concept.
        const duplicate = englishConcepts.get(normalize(en));
        const canonicalId = googleType ? 'google_places:' + googleType : (mapped?.startsWith('dalil:') ? mapped : duplicate?.canonicalId || 'dalil:' + id);
        if (!categories.has(canonicalId)) categories.set(canonicalId, {
          canonicalId, googlePlaceType: null, googleGcid: null, labels: { ar: name, en }, aliases: {},
          groupId: sector.id, parentId: branch.id, classificationOrigin: 'dalil_discovery_concept',
          labelOrigin: 'dalil_translation', source: 'legacy:taxonomy-engine.js', sourceVersion: '2.0.0',
          symbolId: symbolId(canonicalId), legacyLeafIds: [], attributeSchema: [],
          supportedProviders: ['google_maps_dom'], osmTags: [], osmMapping: null,
          countryAvailability: { status: 'unknown', countries: [], reason: 'legacy_discovery_term_not_provider_category' }
        });
        const category = categories.get(canonicalId);
        if (!category.labels.ar) category.labels.ar = name;
        if (!category.groupId) { category.groupId = sector.id; category.parentId = branch.id; }
        category.legacyLeafIds.push(id);
        const attributes = [];
        if (/تاريخي|أثري|أثرية/.test(name)) attributes.push({ key: 'heritage', value: true, origin: 'discovery_term', verified: false });
        if (name === 'مسجد كبير') attributes.push({ key: 'size', value: 'large', origin: 'discovery_term', verified: false });
        if(en==='Women’s prayer room')attributes.push({key:'gender_access',value:'women',origin:'discovery_term',verified:false});
        const prayerContext={'Roadside prayer room':'roadside','Shopping center prayer room':'shopping_mall','Hospital prayer room':'hospital','Airport prayer room':'airport'}[en];
        if(prayerContext)attributes.push({key:'location_context',value:prayerContext,origin:'discovery_term',verified:false});
        if (name === 'كنيسة كاثوليكية') attributes.push({ key: 'denomination', value: 'catholic', origin: 'discovery_term', verified: false });
        if (name === 'كنيسة أرثوذكسية') attributes.push({ key: 'denomination', value: 'orthodox', origin: 'discovery_term', verified: false });
        const leaf = {
          id, name_ar: name, name_en: en, labels: { ar: name, en }, canonicalId,
          googlePlaceType: googleType, googleGcid: null, symbolId: category.symbolId,
          classificationOrigin: 'dalil_discovery_term', mappingRelation: googleType ? (directType === googleType ? 'equivalent' : 'broader_or_alias') : 'unmapped',
          descriptiveAttributes: attributes, branchId: branch.id, sectorId: sector.id,
          branchNameAr: branch.name_ar, branchNameEn: branch.name_en,
          sectorNameAr: sector.name_ar, sectorNameEn: sector.name_en
        };
        category.searchTerms=category.searchTerms||[];
        category.searchTerms.push({leafId:id,labels:{ar:name,en},kind:attributes.length?'descriptive_variant':googleType&&directType!==googleType?'local_alias':'label',descriptiveAttributes:attributes});
        leafById.set(id, leaf);
        const labelKey = normalize(name);
        if (!labelLeaves.has(labelKey)) labelLeaves.set(labelKey, []);
        labelLeaves.get(labelKey).push(leaf);
        if (!duplicate) englishConcepts.set(normalize(en), leaf);
        addIndex(name, category, 'ar', id); addIndex(en, category, 'en', id); addIndex(id, category, null, id);
        return leaf;
      });
    }
    for (const c of categories.values()) {
      addIndex(c.canonicalId, c); addIndex(c.googlePlaceType, c);
      for (const [locale, label] of Object.entries(c.labels)) addIndex(label, c, locale);
      for (const [locale, aliases] of Object.entries(c.aliases)) for (const label of aliases) addIndex(label, c, locale);
    }
    // A zawiya can be a religious lodge or a corner. Country alone is not proof.
    const ambiguousTerms = new Set([normalize('زاوية'), normalize('zawiya')]);
    function getLeaf(value) {
      const key = typeof value === 'object' && value ? value.id || value.name_ar || value.name_en : value;
      if (leafById.has(key)) return leafById.get(key);
      const matches = labelLeaves.get(normalize(key)) || [...leafById.values()].filter(l => normalize(l.name_en) === normalize(key));
      if (typeof value === 'object' && value?.branchId) return matches.find(l => l.branchId === value.branchId) || null;
      return matches.length && new Set(matches.map(l => l.name_en)).size === 1 ? matches[0] : null;
    }
    function rankCandidates(value, options = {}) {
      const q = normalize(value).slice(0, 128); if (!q) return [];
      const exact = index.get(q) || [];
      const matches = exact.map(e => ({ ...e, score: 1, matchKind: 'exact' }));
      if (!matches.length && options.fuzzy !== false && q.length >= 4) {
        const maxDistance = q.length < 8 ? 1 : 2;
        for (const [label, entries] of index) {
          const distance = editDistance(q, label, maxDistance);
          if (distance <= maxDistance) for (const e of entries) matches.push({ ...e, score: 1 - distance / Math.max(Array.from(q).length, Array.from(label).length), matchKind: 'suggestion' });
        }
      }
      const country = String(options.country || '').toUpperCase();
      const unique = new Map();
      for (const m of matches.sort((a, b) => b.score - a.score || a.category.canonicalId.localeCompare(b.category.canonicalId))) {
        const availability = m.category.countryAvailability;
        if (country && availability.status === 'restricted' && !availability.countries.includes(country)) continue;
        if (!unique.has(m.category.canonicalId)) unique.set(m.category.canonicalId, {
          category: m.category, canonicalId: m.category.canonicalId, label: m.label,
          score: Number(m.score.toFixed(4)), matchKind: m.matchKind,
          requiresReview: m.matchKind !== 'exact' || ambiguousTerms.has(q) || exact.length > 1,
          reason: ambiguousTerms.has(q) ? 'ambiguous_local_term' : m.matchKind === 'suggestion' ? 'spelling_suggestion' : 'indexed_label_or_alias'
        });
      }
      return [...unique.values()].slice(0, Math.min(20, Math.max(1, Number(options.limit) || 5)));
    }
    function resolveConcept(value, options = {}) {
      if (typeof value === 'object' && value) {
        const explicit = value.canonicalId || value.categoryId || value.id;
        if (categories.has(explicit)) return categories.get(explicit);
        const leaf = leafById.get(explicit); if (leaf) return categories.get(leaf.canonicalId);
        value = value.category || value.searchKeyword || value.name || '';
      }
      if (categories.has(value)) return categories.get(value);
      const leaf = leafById.get(value); if (leaf) return categories.get(leaf.canonicalId);
      const pick = list => (list.length === 1 && !list[0].requiresReview ? list[0].category : null);
      const direct = pick(rankCandidates(value, { ...options, fuzzy: false }));
      if (direct) return direct;
      // "إلمدرسة" folds to "المدرسه" while the index stores "مدرسه": a leading
      // definite article (or its hamza-misplaced spelling) is a variant of the
      // same place type, not a different one. Only used when the direct exact
      // lookup could not decide, so no existing confident match changes.
      if (typeof value === 'string') {
        const folded = normalize(value);
        const bare = folded.replace(/^ال/, '').replace(/^al[\s-]?/, '').trim();
        if (bare && bare !== folded) {
          const retried = pick(rankCandidates(bare, { ...options, fuzzy: false }));
          if (retried) return retried;
        }
      }
      return null;
    }
    function audit() {
      const untranslated = [...leafById.values()].filter(l => !l.name_ar || !l.name_en || /[\u0600-\u06ff]/.test(l.name_en));
      const aliasCollisions = [...index].filter(([key, values]) => values.length > 1 && !/^s\d+\./.test(key)).map(([term, values]) => ({ term, canonicalIds: values.map(v => v.category.canonicalId) }));
      return {
        leaves: leafById.size, concepts: categories.size, officialTypes: official.size,
        mappedLeaves: [...leafById.values()].filter(l => l.googlePlaceType).length,
        untranslatedLeafIds: untranslated.map(l => l.id), missingSymbolIds: [...categories.values()].filter(c => !c.symbolId).map(c => c.canonicalId),
        aliasCollisions, gcidsInferred: false
      };
    }
    return { getCategory: id => categories.get(id) || null, getCategories: () => [...categories.values()], getLeaf, resolveConcept, rankCandidates, audit, normalize,
      getLocalizedLeaf(value, locale = 'ar') {
        const language = String(locale).split('-')[0]; const leaf = getLeaf(value);
        if (leaf) return leaf.labels[language] || (language === 'ar' ? leaf.name_ar : leaf.name_en);
        const concept = resolveConcept(value); if (concept) return concept.labels[language] || concept.labels.en;
        const raw = String(typeof value === 'object' ? value?.name_ar || '' : value || '');
        return language === 'en' && /[\u0600-\u06ff]/.test(raw) ? 'Custom search term' : raw;
      }
    };
  }

  let activeRegistry = null;
  return {
    GOOGLE_TYPES_SNAPSHOT, OSM_PRESET_METADATA, ENGLISH_LEAVES, create, normalize, symbolId,
    use(registry) { activeRegistry = registry; },
    resolveConcept(value, options) { return activeRegistry?.resolveConcept(value, options) || null; },
    getCategory(id) { return activeRegistry?.getCategory(id) || null; },
    getCategories() { return activeRegistry?.getCategories() || []; },
    rankCandidates(value, options) { return activeRegistry?.rankCandidates(value, options) || []; }
  };
});
