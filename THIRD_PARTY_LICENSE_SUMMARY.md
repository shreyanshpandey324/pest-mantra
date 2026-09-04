# Third-Party Dependency License Summary

Generated from `package-lock.json` on 2026-09-02. This is an operational inventory, not a replacement for the license text shipped by each dependency or for legal review.

The lockfile contains 808 installed package-path entries representing 736 package names. Its declared license-field distribution is:

| SPDX/license field | Entries |
| --- | ---: |
| MIT | 585 |
| Apache-2.0 | 106 |
| ISC | 46 |
| BSD-3-Clause | 16 |
| MPL-2.0 | 13 |
| BSD-2-Clause | 11 |
| LGPL-3.0-or-later | 10 |
| BlueOak-1.0.0 | 6 |
| Apache-2.0 AND LGPL-3.0-or-later | 3 |
| Not declared in lockfile | 3 |
| Hippocratic-2.1 | 2 |
| Other declared combinations/licenses | 7 |

The three entries without a lockfile license field are `busboy@1.6.0`, `limiter@1.1.5` and `streamsearch@1.1.0`. Verify their installed package metadata/license files during the release compliance review.

## Direct dependencies

| Package | Locked version | Declared license | Workspace(s) |
| --- | --- | --- | --- |
| @googlemaps/js-api-loader | 2.1.1 | Apache-2.0 | admin-web |
| @tailwindcss/postcss | 4.3.3 | MIT | admin-web, technician-app |
| @types/bcryptjs | 2.4.6 | MIT | backend |
| @types/cookie-parser | 1.4.10 | MIT | backend |
| @types/cors | 2.8.19 | MIT | backend |
| @types/express | 4.17.25 | MIT | backend |
| @types/google.maps | 3.65.5 | MIT | admin-web |
| @types/jsonwebtoken | 9.0.10 | MIT | backend |
| @types/leaflet | 1.9.22 | MIT | admin-web |
| @types/morgan | 1.9.10 | MIT | backend |
| @types/multer | 1.4.13 | MIT | backend |
| @types/node | 20.19.43 | MIT | all |
| @types/react | 19.2.18 | MIT | admin-web, technician-app |
| @types/react-dom | 19.2.4 | MIT | admin-web, technician-app |
| bcryptjs | 2.4.3 | MIT | backend |
| cookie-parser | 1.4.7 | MIT | backend |
| cors | 2.8.6 | MIT | backend |
| dotenv | 16.6.1 | BSD-2-Clause | backend |
| eslint | 8.57.1 | MIT | all |
| eslint-config-next | 15.5.22 | MIT | admin-web, technician-app |
| express | 4.22.2 | MIT | backend |
| express-rate-limit | 7.5.1 | MIT | backend |
| firebase | 12.18.0 | Apache-2.0 | admin-web, technician-app |
| firebase-admin | 14.3.0 | Apache-2.0 | backend |
| helmet | 7.2.0 | MIT | backend |
| jose | 5.10.0 | MIT | admin-web, technician-app |
| jsonwebtoken | 9.0.3 | MIT | backend |
| leaflet | 1.9.4 | BSD-2-Clause | admin-web |
| mongoose | 8.24.2 | MIT | backend |
| morgan | 1.11.0 | MIT | backend |
| multer | 1.4.5-lts.2 | MIT | backend |
| next | 15.5.22 | MIT | admin-web, technician-app |
| postcss | 8.5.25 | MIT | admin-web, technician-app |
| react | 19.2.8 | MIT | admin-web, technician-app |
| react-dom | 19.2.8 | MIT | admin-web, technician-app |
| react-is | 19.2.8 | MIT | admin-web |
| react-leaflet | 5.0.0 | Hippocratic-2.1 | admin-web |
| recharts | 3.10.1 | MIT | admin-web |
| tailwindcss | 4.3.3 | MIT | admin-web, technician-app |
| tsx | 4.23.1 | MIT | backend |
| typescript | 5.9.3 | Apache-2.0 | all |
| zod | 3.25.76 | MIT | backend |

## Release compliance step

After `npm ci`, collect the actual license files from the installed dependency tree if the customer's distribution or legal policy requires bundled notices. Review provider terms separately for Firebase, Google Maps and any future messaging, payment or storage account.
