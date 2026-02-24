import { useEffect, useState } from "react";
import CloseIcon from "assets/icons/cross.svg?react";
import ErrorIcon from "assets/icons/red-cross.svg?react";
import InfoIcon from "assets/icons/info.svg?react";
import SuccessIcon from "assets/icons/tick.svg?react";
import WarningIcon from "assets/icons/notifications.svg?react";
import "./index.css";

const Alert = (props) => {
  const {
    message,
    type = "info",
    isOpened,
    setIsOpened,
    autoDismiss = true,
    dismissTime = 5000,
    position = "top-center",
  } = props;

  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpened) {
      setIsVisible(true);
      setIsExiting(false);

      // Auto dismiss functionality
      if (autoDismiss && dismissTime > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, dismissTime);

        return () => clearTimeout(timer);
      }
    } else {
      handleClose();
    }
  }, [isOpened, autoDismiss, dismissTime]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsOpened(false);
    }, 300); // Match the CSS transition duration
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return <ErrorIcon className="alert-icon" />;
      case "success":
        return <SuccessIcon className="alert-icon" />;
      case "warning":
        return <WarningIcon className="alert-icon" />;
      case "info":
      default:
        return <InfoIcon className="alert-icon" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case "error":
        return "Error";
      case "success":
        return "Success";
      case "warning":
        return "Warning";
      case "info":
      default:
        return "Information";
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`alert-container ${position}`}>
      <div
        className={`alert ${type} ${isExiting ? "alert-exit" : "alert-enter"}`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="alert-header">
          <div className="alert-icon-container">{getIcon()}</div>
          <div className="alert-content">
            <h4 className="alert-title">{getTitle()}</h4>
            <p className="alert-message">{message}</p>
          </div>
          <button
            className="alert-close-btn"
            onClick={handleClose}
            aria-label="Close alert"
            type="button"
          >
            <CloseIcon className="close-icon" />
          </button>
        </div>

        {/* Progress bar for auto-dismiss */}
        {autoDismiss && dismissTime > 0 && (
          <div className="alert-progress">
            <div
              className="alert-progress-bar"
              style={{
                animationDuration: `${dismissTime}ms`,
                animationPlayState: isExiting ? "paused" : "running",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
