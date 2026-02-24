import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import SingleTickIcon from "assets/icons/single-tick.svg?react";

const CheckBox = ({ onCheck }) => {
  const [checked, setChecked] = useState(false);

  useEffect(() => onCheck(checked), [checked]);

  return (
    <div
      onClick={() => setChecked(!checked)}
      className="transition w-6 h-6 cursor-pointer bg-300 shadow-md rounded-md relative"
    >
      {checked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute top-0 left-0 h-full w-full bg-primary rounded-md flex justify-center items-center"
        >
          <SingleTickIcon color="white" />
        </motion.div>
      )}
    </div>
  );
};

export default CheckBox;
