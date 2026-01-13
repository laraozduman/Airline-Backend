import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter with Gmail
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password, not regular password
      },
    });
  }

  async sendWelcomeEmail(email: string, firstName: string, memberNumber: string): Promise<void> {
    console.log('Sending welcome email to:', email);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Miles&Smiles! ✈️',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Welcome to Miles&Smiles, ${firstName}!</h2>
          
          <p>Thank you for joining our loyalty program.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Membership Details:</h3>
            <p><strong>Member Number:</strong> ${memberNumber}</p>
          </div>
          
          <p>Start earning miles with every flight and enjoy exclusive benefits including:</p>
          <ul>
            <li>Earn miles on every flight</li>
            <li>Priority boarding</li>
            <li>Exclusive member discounts</li>
            <li>Redeem miles for free flights</li>
          </ul>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>The Airline Team</strong></p>
        </div>
      `,
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        await this.transporter.sendMail(mailOptions);
        console.log(' Welcome email sent successfully');
      } else {
        console.log('  Email credentials not configured, skipping email send');
        console.log(`   Would have sent welcome email to ${email}`);
      }
    } catch (error) {
      console.error(' Failed to send welcome email:', error);
      throw error;
    }
  }

  async sendBookingConfirmation(
    email: string,
    bookingReference: string,
    flightDetails: any,
    passengers: number,
    totalPrice: number
  ): Promise<void> {
    console.log('Sending booking confirmation to:', email);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Booking Confirmation - ${bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Booking Confirmation</h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Reference: ${bookingReference}</h3>
            
            <p><strong>Flight:</strong> ${flightDetails.flightNumber}</p>
            <p><strong>From:</strong> ${flightDetails.departure}</p>
            <p><strong>To:</strong> ${flightDetails.arrival}</p>
            <p><strong>Date:</strong> ${new Date(flightDetails.departureTime).toLocaleString()}</p>
            <p><strong>Passengers:</strong> ${passengers}</p>
            <p><strong>Total:</strong> $${totalPrice.toFixed(2)}</p>
          </div>
          
          <p>Thank you for choosing us!</p>
          <p>Have a great flight!</p>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>The Airline Team</strong></p>
        </div>
      `,
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        await this.transporter.sendMail(mailOptions);
        console.log(' Booking confirmation email sent successfully');
      } else {
        console.log('  Email credentials not configured, skipping email send');
        console.log(`   Would have sent booking confirmation to ${email}`);
      }
    } catch (error) {
      console.error(' Failed to send booking confirmation:', error);
    }
  }

  async sendMilesUpdateEmail(email: string, firstName: string, milesAdded: number, newBalance: number): Promise<void> {
    console.log(' Sending miles update email to:', email);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Miles Added to Your Account! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Great News, ${firstName}!</h2>
          
          <p>Miles have been added to your Miles&Smiles account.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Miles Added:</strong> ${milesAdded}</p>
            <p><strong>New Balance:</strong> ${newBalance} miles</p>
          </div>
          
          <p>Keep flying to earn more miles and unlock exclusive rewards!</p>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>The Airline Team</strong></p>
        </div>
      `,
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        await this.transporter.sendMail(mailOptions);
        console.log(' Miles update email sent successfully');
      } else {
        console.log('  Email credentials not configured, skipping email send');
        console.log(`   Would have sent miles update to ${email}`);
      }
    } catch (error) {
      console.error(' Failed to send miles update email:', error);
    }
  }
}

