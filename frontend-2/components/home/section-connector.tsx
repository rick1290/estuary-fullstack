type ConnectorType = "wave" | "curve" | "angle" | "none"
type ConnectorColor = string

interface SectionConnectorProps {
  type?: ConnectorType
  fromColor?: ConnectorColor
  toColor?: ConnectorColor
  height?: number
  flip?: boolean
}

export default function SectionConnector({
  type = "wave",
  fromColor = "#ffffff",
  toColor = "#f5f7fa",
  height = 80,
  flip = false,
}: SectionConnectorProps) {
  const getConnectorPath = () => {
    switch (type) {
      case "wave":
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='${encodeURIComponent(
          toColor,
        )}' fillOpacity='1' d='M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,149.3C960,160,1056,160,1152,138.7C1248,117,1344,75,1392,53.3L1440,32L1440,${
          flip ? "0" : "320"
        }L1392,${flip ? "0" : "320"}C1344,${flip ? "0" : "320"},1248,${flip ? "0" : "320"},1152,${
          flip ? "0" : "320"
        }C1056,${flip ? "0" : "320"},960,${flip ? "0" : "320"},864,${flip ? "0" : "320"}C768,${
          flip ? "0" : "320"
        },672,${flip ? "0" : "320"},576,${flip ? "0" : "320"}C480,${flip ? "0" : "320"},384,${
          flip ? "0" : "320"
        },288,${flip ? "0" : "320"}C192,${flip ? "0" : "320"},96,${flip ? "0" : "320"},48,${
          flip ? "0" : "320"
        }L0,${flip ? "0" : "320"}Z'%3E%3C/path%3E%3C/svg%3E")`
      case "curve":
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='${encodeURIComponent(
          toColor,
        )}' fillOpacity='1' d='M0,224L80,213.3C160,203,320,181,480,181.3C640,181,800,203,960,197.3C1120,192,1280,160,1360,144L1440,128L1440,${
          flip ? "0" : "320"
        }L1360,${flip ? "0" : "320"}C1280,${flip ? "0" : "320"},1120,${flip ? "0" : "320"},960,${
          flip ? "0" : "320"
        }C800,${flip ? "0" : "320"},640,${flip ? "0" : "320"},480,${flip ? "0" : "320"}C320,${
          flip ? "0" : "320"
        },160,${flip ? "0" : "320"},80,${flip ? "0" : "320"}L0,${flip ? "0" : "320"}Z'%3E%3C/path%3E%3C/svg%3E")`
      case "angle":
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='${encodeURIComponent(
          toColor,
        )}' fillOpacity='1' d='M0,288L1440,64L1440,${flip ? "0" : "320"}L0,${
          flip ? "0" : "320"
        }Z'%3E%3C/path%3E%3C/svg%3E")`
      default:
        return "none"
    }
  }

  return null // Remove all section connectors from the page
}
