const React = require("react");

const Spinner = () => (
  <div className="sk-circle">
    <div className="sk-circle1 sk-child" />
    <div className="sk-circle2 sk-child" />
    <div className="sk-circle3 sk-child" />
    <div className="sk-circle4 sk-child" />
    <div className="sk-circle5 sk-child" />
    <div className="sk-circle6 sk-child" />
    <div className="sk-circle7 sk-child" />
    <div className="sk-circle8 sk-child" />
    <div className="sk-circle9 sk-child" />
    <div className="sk-circle10 sk-child" />
    <div className="sk-circle11 sk-child" />
    <div className="sk-circle12 sk-child" />
  </div>
);

const WrappedSpinner = () => (
  <div className="flex w-100 h-100">
    <Spinner />
  </div>
);

const Loader = ({ visible }) => {
  if (!visible) {
    return null;
  }
  return (
    <div className="loader">
      <Spinner />
    </div>
  );
};

module.exports = { Loader, Spinner, WrappedSpinner };
