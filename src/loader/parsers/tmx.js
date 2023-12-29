import * as fileUtil from "../../utils/file.js";
import level from "../../level/level.js";
import * as TMXUtils from "../../level/tiled/TMXUtils.js";
import { tmxList } from "../cache.js";
import { fetchData } from "./fetchdata.js";


/**
 * parse/preload a TMX file
 * @param {loader.Asset} data - asset data
 * @param {Function} [onload] - function to be called when the asset is loaded
 * @param {Function} [onerror] - function to be called in case of error
 * @param {Function} [fetchData] - function to use instead of default window.fetch, has some error handling and things
 * @returns {number} the amount of corresponding resource parsed/preloaded
 * @ignore
 */
export function preloadTMX(tmxData, onload, onerror) {
    if (typeof tmxList[tmxData.name] !== "undefined") {
        // already loaded
        return 0;
    }

    /**
     * @ignore
     */
    function addToTMXList(data) {
        // set the TMX content
        tmxList[tmxData.name] = data;

        // add the tmx to the level manager
        if (tmxData.type === "tmx") {
            level.add(tmxData.type, tmxData.name);
        }
    }

    //if the data is in the tmxData object, don't get it via a XMLHTTPRequest
    if (tmxData.data) {
        addToTMXList(tmxData.data);
        if (typeof onload === "function") {
            onload();
        }
        return;
    }

    fetchData(tmxData.src, "text")
        .then(response => {
            if (typeof response !== "string") {
                throw new Error("Invalid response type");
            }

            let result;

            switch (fileUtil.getExtension(tmxData.src)) {
                case "xml":
                case "tmx":
                case "tsx": {
                    const parser = new DOMParser();

                    if (typeof parser.parseFromString === "undefined") {
                        throw new Error(
                            "XML file format loading supported, use the JSON file format instead"
                        );
                    }

                    const xmlDoc = parser.parseFromString(response, "text/xml");
                    const data = TMXUtils.parse(xmlDoc);

                    switch (fileUtil.getExtension(tmxData.src)) {
                        case "tmx":
                            result = data.map;
                            break;

                        case "tsx":
                            result = data.tilesets[0];
                            break;
                    }
                    break;
                }
                case "json":
                case "tmj":
                case "tsj":
                    result = JSON.parse(response);
                    break;
                default:
                    throw new Error(`TMX file format not supported: ${fileUtil.getExtension(tmxData.src)}`);
            }

            addToTMXList(result);

            if (typeof onload === "function") {
                onload();
            }
        })
        .catch(error => {
            if (typeof onerror === "function") {
                onerror(error);
            }
        });

    return 1;
}
