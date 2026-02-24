import axios from "axios";

export const sendCode = async (phone, code) => {
  try {
    console.log(code);
    const url = `${process.env.RESALA_API_URL}/messages/send-template?sms_template_id=${process.env.RESALA_TEMPLATE_ID}`;
    const res = await axios.post(
      url,
      {
        records: [{ phone, $code: code }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESALA_API_KEY}`,
        },
      },
    );
  } catch (error) {
    console.error("Error sending verification phone:", error);
  }
};
